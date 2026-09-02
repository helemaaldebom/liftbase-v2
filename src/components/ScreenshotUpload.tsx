import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertCircle, Image as ImageIcon, FileText, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface UploadAttempt {
  attempt: number;
  error: string;
  type: string; // 'network' | 'storage' | 'database' | 'unknown'
  timestamp: string;
}

interface UploadErrorEntry {
  filename: string;
  filesize: number;
  attempts: UploadAttempt[];
}
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callOpenAI(body: object): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API fout');
  }
  return data;
}

interface ScreenshotUploadProps {
  onDataExtracted: (data: any) => void;
  equipmentType: string;
  onScreenshotCaptured?: (file: File) => void;
  dossierId?: string;
  onPhotosUploaded?: () => void;
}

export function ScreenshotUpload({ onDataExtracted, equipmentType, onScreenshotCaptured, dossierId, onPhotosUploaded }: ScreenshotUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosMessage, setPhotosMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(new Map());
  const [currentPdfFile, setCurrentPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadErrorLog, setUploadErrorLog] = useState<UploadErrorEntry[]>([]);
  const [errorLogExpanded, setErrorLogExpanded] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(false);

    // Build a map of all uploaded files
    const fileMap = new Map<string, File>();
    let htmlFile: File | null = null;
    const imageFiles: File[] = [];
    let pdfFile: File | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isHTML = file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm');
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      if (isPDF) {
        pdfFile = file;
      } else if (isHTML) {
        htmlFile = file;
      } else if (isImage) {
        imageFiles.push(file);
        // Store with normalized filename for matching
        const normalizedName = file.name.toLowerCase();
        fileMap.set(normalizedName, file);
        fileMap.set(file.name, file);
      }
    }

    // Single PDF file - analyze as PDF
    if (files.length === 1 && pdfFile) {
      setCurrentPdfFile(pdfFile);
      setUploading(true);
      setPreview('pdf');
      analyzePDF(pdfFile);
      return;
    }

    // One or more image files - analyze as screenshots
    if (imageFiles.length > 0 && !htmlFile && !pdfFile) {
      setUploading(true);
      if (imageFiles.length === 1) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
          analyzeImage(reader.result as string, imageFiles[0]);
        };
        reader.readAsDataURL(imageFiles[0]);
      } else {
        setPreview('multiple-images');
        analyzeMultipleImages(imageFiles);
      }
      return;
    }

    // No HTML, PDF, and no images
    if (!htmlFile && imageFiles.length === 0 && !pdfFile) {
      setError('Upload een PDF, HTML bestand (+ optionele afbeeldingen) of één of meerdere screenshots');
      return;
    }

    // HTML file with optional images
    if (htmlFile) {
      setUploadedFiles(fileMap);
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview('html');
        analyzeHTML(reader.result as string, htmlFile!, fileMap);
      };
      reader.readAsText(htmlFile);
    }
  };

  const extractURLFromHTML = (html: string): string | null => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Try to find canonical URL
      const canonicalLink = tempDiv.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
        const url = canonicalLink.getAttribute('href');
        if (url) {
          console.log('Found canonical URL:', url);
          return url;
        }
      }

      // Try to find og:url meta tag
      const ogUrl = tempDiv.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        const url = ogUrl.getAttribute('content');
        if (url) {
          console.log('Found og:url:', url);
          return url;
        }
      }

      // Try to find any URL in meta tags
      const metaTags = tempDiv.querySelectorAll('meta');
      for (const meta of Array.from(metaTags)) {
        const content = meta.getAttribute('content');
        if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
          // Verify it looks like a real URL (not an image or other resource)
          if (content.includes('mascus.') || content.includes('trucks.') ||
              content.includes('truckscout') || content.includes('machineseeker') ||
              content.includes('forkliftinternational')) {
            console.log('Found URL in meta tag:', content);
            return content;
          }
        }
      }

      console.log('No URL found in HTML');
      return null;
    } catch (e) {
      console.error('Error extracting URL from HTML:', e);
      return null;
    }
  };

  const cleanHTML = (html: string): string => {
    // First check if HTML is too short (likely invalid)
    if (html.length < 500) {
      console.warn('HTML file is very short:', html.length, 'characters');
      // Return the raw HTML if it's very short - might be a fragment
      return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
    }

    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    try {
      tempDiv.innerHTML = html;
    } catch (e) {
      console.error('Failed to parse HTML:', e);
      // Fallback: strip tags with regex
      return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
    }

    // Remove script and style tags
    const scripts = tempDiv.querySelectorAll('script, style, noscript, header, footer, nav');
    scripts.forEach(el => el.remove());

    // Try to find main content areas (common selectors for various sites)
    const mainContentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '#main-content',
      '.content',
      '#content',
      'article',
      '.ad-details',
      '.product-details',
      '.vehicle-details',
      '.listing-details',
      '.ad-content',
      '.description',
      'body'
    ];

    let mainContent: Element | null = null;
    for (const selector of mainContentSelectors) {
      const el = tempDiv.querySelector(selector);
      if (el) {
        const text = (el.textContent || el.innerText || '').trim();
        if (text.length > 100) { // Only use if it has substantial content
          mainContent = el;
          console.log(`Found main content using selector: ${selector}, length: ${text.length}`);
          break;
        }
      }
    }

    // Get text content from main area if found, otherwise full content
    let textContent = mainContent
      ? (mainContent.textContent || mainContent.innerText || '')
      : (tempDiv.textContent || tempDiv.innerText || '');

    // Clean up whitespace
    textContent = textContent
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();

    // If still empty or too short, try to extract any text from HTML
    if (textContent.length < 100) {
      console.warn('Text content too short after cleaning:', textContent.length);
      // Last resort: strip all HTML tags and get whatever text is there
      textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Limit to approximately 30000 characters to capture more content
    if (textContent.length > 30000) {
      textContent = textContent.substring(0, 30000) + '... (gekort)';
    }

    return textContent;
  };

  const findLocalImageFile = (src: string, uploadedFiles: Map<string, File>): File | null => {
    // Extract just the filename from the path
    const parts = src.split('/');
    const filename = parts[parts.length - 1];

    console.log(`Zoeken naar lokaal bestand: "${filename}"`);
    console.log(`Beschikbare bestanden:`, Array.from(uploadedFiles.keys()));

    // Try exact match
    if (uploadedFiles.has(filename)) {
      console.log(`✓ Exacte match gevonden: ${filename}`);
      return uploadedFiles.get(filename)!;
    }

    // Try case-insensitive match
    const lowerFilename = filename.toLowerCase();
    for (const [key, file] of uploadedFiles.entries()) {
      if (key.toLowerCase() === lowerFilename) {
        console.log(`✓ Case-insensitive match gevonden: ${key}`);
        return file;
      }
    }

    // Try to decode URL-encoded filename
    try {
      const decodedFilename = decodeURIComponent(filename);
      if (decodedFilename !== filename) {
        console.log(`Proberen met gedecodeerde naam: ${decodedFilename}`);
        if (uploadedFiles.has(decodedFilename)) {
          console.log(`✓ Match gevonden met gedecodeerde naam`);
          return uploadedFiles.get(decodedFilename)!;
        }
      }
    } catch (e) {
      // Ignore decode errors
    }

    // Try to find by partial match (in case of URL encoding or special chars)
    for (const [key, file] of uploadedFiles.entries()) {
      if (key.includes(filename) || filename.includes(key)) {
        console.log(`✓ Gedeeltelijke match gevonden: ${key}`);
        return file;
      }
    }

    console.log(`✗ Geen match gevonden voor: ${filename}`);
    return null;
  };

  const extractImagesFromHTML = async (html: string, uploadedFiles: Map<string, File> = new Map()): Promise<File[]> => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const images = tempDiv.querySelectorAll('img');
    const files: File[] = [];

    console.log(`Gevonden ${images.length} img tags in HTML`);
    console.log(`${uploadedFiles.size} afbeeldingsbestanden mee geüpload`);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.getAttribute('src') || img.src;

      console.log(`Afbeelding ${i}: src="${src}"`);

      if (!src || src.length < 10) {
        console.log(`Overgeslagen - geen geldige src`);
        continue;
      }

      try {
        if (src.startsWith('data:')) {
          console.log(`Data URL gevonden, converting...`);
          const file = await dataURLtoFile(src, `image-${i}.jpg`);
          if (file) {
            console.log(`Data URL geconverteerd: ${file.size} bytes`);
            files.push(file);
          }
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          console.log(`Externe URL gevonden, downloading...`);
          const file = await downloadImageAsFile(src, `image-${i}.jpg`);
          if (file) {
            console.log(`Externe afbeelding gedownload: ${file.size} bytes`);
            files.push(file);
          } else {
            console.log(`Download mislukt (mogelijk CORS geblokkeerd)`);
          }
        } else {
          // Try to find in uploaded files
          const localFile = findLocalImageFile(src, uploadedFiles);
          if (localFile) {
            console.log(`Lokale afbeelding gevonden: ${localFile.name} (${localFile.size} bytes)`);
            files.push(localFile);
          } else {
            console.log(`Overgeslagen - relatieve URL niet gevonden in geüploade bestanden`);
          }
        }
      } catch (err) {
        console.error(`Fout bij extraheren afbeelding ${i}:`, err);
      }
    }

    console.log(`${files.length} afbeeldingen succesvol geëxtraheerd`);
    return files;
  };

  const dataURLtoFile = (dataURL: string, filename: string): File | null => {
    try {
      if (!dataURL || !dataURL.includes(',')) {
        console.warn('Invalid data URL format');
        return null;
      }

      const arr = dataURL.split(',');
      if (arr.length !== 2) {
        console.warn('Data URL does not have expected format');
        return null;
      }

      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const base64Data = arr[1].trim();

      if (!base64Data || base64Data.length === 0) {
        console.warn('Empty base64 data');
        return null;
      }

      const bstr = atob(base64Data);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (err) {
      console.error('Error converting data URL to file:', err);
      return null;
    }
  };

  const downloadImageAsFile = async (url: string, filename: string): Promise<File | null> => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return null;

      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    } catch (err) {
      console.error('Error downloading image:', err);
      return null;
    }
  };

  const classifyError = (err: any): { message: string; type: string } => {
    const msg = err?.message || err?.toString() || 'Onbekende fout';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
      return { message: msg, type: 'network' };
    }
    if (err?.statusCode || err?.status) {
      return { message: `HTTP ${err.statusCode || err.status}: ${msg}`, type: 'storage' };
    }
    if (msg.includes('duplicate') || msg.includes('violates') || msg.includes('unique')) {
      return { message: msg, type: 'database' };
    }
    return { message: msg, type: 'unknown' };
  };

  const uploadPhotoFile = async (file: File, dossierId: string): Promise<{ success: boolean; errorEntry?: UploadErrorEntry }> => {
    // Validate file size (minimum 100 bytes, maximum 5MB)
    if (file.size < 100) {
      console.error(`Bestand te klein (${file.size} bytes), wordt overgeslagen: ${file.name}`);
      return { success: false, errorEntry: { filename: file.name, filesize: file.size, attempts: [{ attempt: 0, error: `Bestand te klein (${file.size} bytes)`, type: 'validation', timestamp: new Date().toISOString() }] } };
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error(`Bestand te groot (${file.size} bytes), wordt overgeslagen: ${file.name}`);
      return { success: false, errorEntry: { filename: file.name, filesize: file.size, attempts: [{ attempt: 0, error: `Bestand te groot (${(file.size / 1024 / 1024).toFixed(1)}MB, max 5MB)`, type: 'validation', timestamp: new Date().toISOString() }] } };
    }

    const maxRetries = 5;
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${dossierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const attemptLog: UploadAttempt[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Uploaden: ${file.name} (${file.size} bytes) — poging ${attempt}/${maxRetries}`);

        const { error: uploadError } = await supabase.storage
          .from('dossier-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          // File already exists — treat as success (previous attempt succeeded)
          if (uploadError.message?.includes('already exists') || (uploadError as any).statusCode === '409') {
            console.log(`✓ Bestand bestaat al (eerder geüpload): ${file.name}`);
          } else {
            throw uploadError;
          }
        }

        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            dossier_id: dossierId,
            storage_path: fileName,
            filename: file.name,
            file_size_bytes: file.size,
            step_key: 'dossier',
            display_order: 0,
            quality_passed: true,
          });

        if (dbError) throw dbError;

        console.log(`✓ Upload succesvol: ${file.name}`);
        return { success: true };
      } catch (err) {
        const classified = classifyError(err);
        console.error(`Upload poging ${attempt} mislukt voor ${file.name}:`, err);
        attemptLog.push({
          attempt,
          error: classified.message,
          type: classified.type,
          timestamp: new Date().toISOString(),
        });
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }

    console.error(`✗ Upload definitief mislukt na ${maxRetries} pogingen: ${file.name}`);
    return { success: false, errorEntry: { filename: file.name, filesize: file.size, attempts: attemptLog } };
  };

  const analyzeHTML = async (htmlContent: string, file: File, uploadedFiles: Map<string, File> = new Map()) => {
    setAnalyzing(true);
    setUploading(false);

    try {
      // Clean and reduce HTML content
      const cleanedContent = cleanHTML(htmlContent);

      console.log('Original HTML length:', htmlContent.length);
      console.log('Cleaned content length:', cleanedContent.length);
      console.log('Cleaned content preview:', cleanedContent.substring(0, 500));

      // Validate that we have enough content to analyze
      if (cleanedContent.length < 50) {
        throw new Error('Het HTML bestand bevat te weinig tekst om te analyseren. Zorg ervoor dat je de complete webpagina opslaat (Ctrl+S → "Webpagina, compleet") en niet alleen de HTML.');
      }

      const result = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `${getAnalysisPrompt(equipmentType)}

Hier is de tekst content van een advertentie pagina:

${cleanedContent}

Extraheer de informatie en geef het resultaat als een JSON object.`
          }
        ],
        max_tokens: 1500
      });
      const content = result.choices[0]?.message?.content;

      console.log('OpenAI Response:', content);

      if (!content) {
        throw new Error('Geen data gevonden in HTML');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Could not find JSON in response. Full response:', content);
        throw new Error('Kon geen gestructureerde data vinden in HTML. Controleer of de pagina machine-informatie bevat.');
      }

      let extractedData;
      try {
        extractedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Attempted to parse:', jsonMatch[0]);
        throw new Error('Ongeldige data structuur in HTML');
      }

      // Extract URL from HTML and add to data
      const url = extractURLFromHTML(htmlContent);
      if (url) {
        extractedData.bron_url = url;
        console.log('Added URL to extracted data:', url);
      }

      if (onScreenshotCaptured) {
        onScreenshotCaptured(file);
      }

      onDataExtracted(extractedData);
      setSuccess(true);

      if (dossierId) {
        setUploadingPhotos(true);
        setPhotosMessage('Bezig met extraheren en uploaden van foto\'s uit HTML...');

        try {
          const imageFiles = await extractImagesFromHTML(htmlContent, uploadedFiles);

          if (imageFiles.length > 0) {
            setPhotosMessage(`${imageFiles.length} foto's gevonden, bezig met uploaden...`);
            setUploadErrorLog([]);

            let uploadedCount = 0;
            const errorEntries: UploadErrorEntry[] = [];
            for (const imageFile of imageFiles) {
              const result = await uploadPhotoFile(imageFile, dossierId);
              if (result.success) {
                uploadedCount++;
              } else if (result.errorEntry) {
                errorEntries.push(result.errorEntry);
              }
            }

            if (errorEntries.length > 0) {
              setUploadErrorLog(errorEntries);
              setErrorLogExpanded(false);
            }

            setPhotosMessage(`${uploadedCount} van ${imageFiles.length} foto's succesvol geüpload!`);

            if (onPhotosUploaded && uploadedCount > 0) {
              onPhotosUploaded();
            }

            setTimeout(() => {
              setPhotosMessage('');
            }, 3000);
          } else {
            setPhotosMessage('Geen foto\'s gevonden in HTML bestand');
            setTimeout(() => {
              setPhotosMessage('');
            }, 2000);
          }
        } catch (photoErr: any) {
          console.error('Error uploading photos:', photoErr);
          setPhotosMessage('Fout bij uploaden van foto\'s');
          setTimeout(() => {
            setPhotosMessage('');
          }, 3000);
        } finally {
          setUploadingPhotos(false);
        }
      }

      setTimeout(() => {
        setPreview(null);
        setSuccess(false);
        setUploadedFiles(new Map());
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const errorMessage = err.message || 'Er is een fout opgetreden bij het analyseren';
      setError(errorMessage + ' - Controleer de console voor meer details of probeer een screenshot in plaats van HTML.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeImage = async (imageData: string, file: File) => {
    setAnalyzing(true);
    setUploading(false);

    try {
      const result = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: getAnalysisPrompt(equipmentType)
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 1500
      });
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Geen data gevonden in afbeelding');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Kon geen gestructureerde data vinden in afbeelding');
      }

      const extractedData = JSON.parse(jsonMatch[0]);

      // Only notify parent about screenshot AFTER successful analysis
      if (onScreenshotCaptured) {
        onScreenshotCaptured(file);
      }

      onDataExtracted(extractedData);
      setSuccess(true);
      setTimeout(() => {
        setPreview(null);
        setSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Er is een fout opgetreden bij het analyseren');
      // Keep the preview visible so user can try again or clear it
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeMultipleImages = async (files: File[]) => {
    setAnalyzing(true);
    setUploading(false);
    setPhotosMessage(`${files.length} screenshots analyseren...`);

    try {
      // Convert all files to base64
      const imageDataPromises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const imageDataArray = await Promise.all(imageDataPromises);

      // Build content array with text prompt and all images
      const contentArray: any[] = [
        {
          type: 'text',
          text: getAnalysisPrompt(equipmentType) + '\n\nDe informatie kan verspreid zijn over meerdere screenshots. Combineer alle informatie uit alle afbeeldingen om een compleet overzicht te geven.'
        }
      ];

      // Add all images
      imageDataArray.forEach((imageData, index) => {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: imageData
          }
        });
      });

      const result = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: contentArray
          }
        ],
        max_tokens: 2000
      });
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Geen data gevonden in afbeeldingen');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Kon geen gestructureerde data vinden in afbeeldingen');
      }

      const extractedData = JSON.parse(jsonMatch[0]);

      // Notify parent about all screenshots
      if (onScreenshotCaptured) {
        files.forEach(file => onScreenshotCaptured(file));
      }

      onDataExtracted(extractedData);
      setSuccess(true);
      setPhotosMessage(`${files.length} screenshots succesvol geanalyseerd!`);

      setTimeout(() => {
        setPreview(null);
        setSuccess(false);
        setPhotosMessage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Er is een fout opgetreden bij het analyseren van de screenshots');
      setPhotosMessage('');
    } finally {
      setAnalyzing(false);
    }
  };

  const getAnalysisPrompt = (type: string): string => {
    const basePrompt = `Analyseer deze afbeelding/advertentie ZEER ZORGVULDIG en extraheer ALLE zichtbare technische specificaties.

INSTRUCTIES:
1. Kijk naar ALLE tekst in het beeld - titels, labels, tabellen, specificaties, kleine lettertjes
2. Extraheer ALLE numerieke waarden (bouwjaar, uren, prijzen, capaciteit, hefhoogte, etc.)
3. Zoek naar: merknaam, model/type, jaar, serienummer, brandstoftype, locatie, prijs, technische specs
4. Als een waarde zichtbaar is maar onduidelijk, gebruik je beste schatting
5. Gebruik ALLEEN null als de informatie echt niet zichtbaar is in het beeld
6. Zet numerieke waarden als numbers (niet strings), bijvoorbeeld: "bouwjaar": 2015

Geef het resultaat als een JSON object met EXACT deze veldnamen:`;

    switch (type) {
      case 'heavy_duty_forklift':
        return `${basePrompt}
{
  "merk": "string (bijv. Kalmar, Toyota)",
  "type": "string (model nummer)",
  "bouwjaar": "number (jaar)",
  "serienummer": "string of null",
  "brandstof": "string (Diesel, Electric, LPG) of null",
  "capaciteit": "number (in kg) of null",
  "lastzwaartepunt": "number (in mm) of null",
  "hefhoogte": "number (in mm) of null",
  "vrije_hef": "number (in mm) of null",
  "uren": "number (urenstand) of null",
  "masttype": "string (duplex, triplex, etc.) of null",
  "land": "string (land) of null",
  "locatie": "string (stad) of null",
  "handelsprijs": "number (prijs in EUR) of null",
  "eindklantprijs": "number (prijs in EUR) of null",
  "bron": "string (website naam zoals Mascus, Trucks.nl, etc.) of null",
  "bron_url": "string (de volledige URL van de advertentie) of null",
  "notities": "string (extra relevante informatie) of null"
}`;

      case 'empty_container_handler':
        return `${basePrompt}
{
  "merk": "string (bijv. Kalmar)",
  "type": "string (model nummer)",
  "bouwjaar": "number (jaar)",
  "serienummer": "string of null",
  "brandstof": "string (Diesel, Electric) of null",
  "capaciteit": "number (in kg) of null",
  "hefhoogte": "number (in mm) of null",
  "uren": "number (urenstand) of null",
  "land": "string (land) of null",
  "locatie": "string (stad) of null",
  "handelsprijs": "number (prijs in EUR) of null",
  "eindklantprijs": "number (prijs in EUR) of null",
  "bron": "string (website naam) of null",
  "bron_url": "string (de volledige URL van de advertentie) of null",
  "notities": "string (extra informatie) of null"
}`;

      case 'reachstacker':
        return `${basePrompt}
{
  "merk": "string (bijv. Kalmar, CVS Ferrari)",
  "type": "string (model nummer)",
  "bouwjaar": "number (jaar)",
  "serienummer": "string of null",
  "brandstof": "string (Diesel) of null",
  "capaciteit": "number (in kg) of null",
  "hefhoogte": "number (in mm) of null",
  "uren": "number (urenstand) of null",
  "land": "string (land) of null",
  "locatie": "string (stad) of null",
  "handelsprijs": "number (prijs in EUR) of null",
  "eindklantprijs": "number (prijs in EUR) of null",
  "bron": "string (website naam) of null",
  "bron_url": "string (de volledige URL van de advertentie) of null",
  "notities": "string (extra informatie) of null"
}`;

      case 'terminal_tractor':
        return `${basePrompt}
{
  "merk": "string (bijv. Kalmar, Terberg)",
  "type": "string (model nummer)",
  "bouwjaar": "number (jaar)",
  "serienummer": "string of null",
  "brandstof": "string (Diesel, Electric) of null",
  "uren": "number (urenstand) of null",
  "land": "string (land) of null",
  "locatie": "string (stad) of null",
  "handelsprijs": "number (prijs in EUR) of null",
  "eindklantprijs": "number (prijs in EUR) of null",
  "bron": "string (website naam) of null",
  "bron_url": "string (de volledige URL van de advertentie) of null",
  "notities": "string (extra informatie) of null"
}`;

      default:
        return basePrompt;
    }
  };

  const analyzePDF = async (pdfFile: File) => {
    setAnalyzing(true);
    setUploading(false);

    try {
      // Step 1: Save PDF as attachment if dossierId is provided
      if (dossierId) {
        const saved = await savePDFAttachment(pdfFile, dossierId);
        if (!saved) {
          setError('Fout bij het opslaan van PDF. Controleer of je bent ingelogd en toegang hebt tot dit dossier.');
          return;
        }
        setPhotosMessage(`PDF "${pdfFile.name}" opgeslagen, bezig met analyseren...`);
      }

      // Step 2: Convert PDF to image using PDF.js
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const arrayBuffer = await pdfFile.arrayBuffer();

      // Load PDF
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      // Get first page
      const page = await pdf.getPage(1);

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Kan geen canvas context maken');
      }

      // Set scale for good quality
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to base64 image
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

      console.log('✅ PDF converted to image, size:', imageBase64.length, 'bytes');

      // Step 3: Analyze with OpenAI Vision
      const prompt = getAnalysisPrompt(equipmentType);
      const result = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert data extraction assistant specialized in reading and extracting technical specifications from equipment advertisements and documentation. You have excellent OCR and visual analysis capabilities. You MUST extract ALL visible information from images, including text in tables, specifications lists, and small print. Always return complete, structured JSON with all available data fields filled in. Only use null when information is truly not visible in the image.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      });
      const content = result.choices[0]?.message?.content;

      console.log('🤖 Raw OpenAI response:', content);

      if (!content) {
        throw new Error('Geen data gevonden in PDF');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ Could not find JSON in response. Full response:', content);
        throw new Error('Kon geen gestructureerde data vinden in PDF.');
      }

      console.log('📋 JSON found in response:', jsonMatch[0]);

      let extractedData;
      try {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('✅ Extracted data from PDF:', extractedData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Ongeldige data structuur in PDF');
      }

      // Validate that we have some data
      if (!extractedData || Object.keys(extractedData).length === 0) {
        throw new Error('Geen data gevonden in PDF response');
      }

      // Step 4: Pass extracted data to parent component
      console.log('🔄 Passing data to parent component...');
      onDataExtracted(extractedData);
      setSuccess(true);
      setPhotosMessage(`PDF succesvol geanalyseerd en gegevens ingevuld!`);

      setTimeout(() => {
        setPreview(null);
        setSuccess(false);
        setPhotosMessage('');
        setCurrentPdfFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
    } catch (err: any) {
      console.error('PDF analysis error:', err);
      setError(err.message || 'Er is een fout opgetreden bij het analyseren van de PDF');
    } finally {
      setAnalyzing(false);
    }
  };

  const savePDFAttachment = async (pdfFile: File, dossierId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return false;
      }

      const timestamp = Date.now();
      const fileName = `${dossierId}/${timestamp}_${pdfFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('dossier-attachments')
        .upload(fileName, pdfFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return false;
      }

      const { error: dbError } = await supabase
        .from('dossier_attachments')
        .insert({
          dossier_id: dossierId,
          file_name: pdfFile.name,
          file_path: fileName,
          file_type: pdfFile.type,
          file_size: pdfFile.size,
          uploaded_by: user.id
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        await supabase.storage
          .from('dossier-attachments')
          .remove([fileName]);
        return false;
      }

      setPhotosMessage(`PDF "${pdfFile.name}" succesvol opgeslagen bij dossier`);
      return true;
    } catch (err) {
      console.error('Save PDF error:', err);
      return false;
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    setSuccess(false);
    setUploadedFiles(new Map());
    setCurrentPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`bg-blue-50 border-2 rounded-lg p-6 transition-all ${
        dragOver
          ? 'border-blue-600 bg-blue-100 shadow-lg'
          : 'border-blue-200 border-dashed'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          <ImageIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Screenshot, PDF of HTML Upload
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {dragOver ? (
              <span className="text-blue-700 font-semibold">Laat bestanden hier los om te uploaden...</span>
            ) : (
              <>
                Sleep bestanden naar hier of klik op de knop om een of meerdere screenshots, een PDF of HTML bestand van een advertentie (Mascus, Trucks.nl, etc.) te uploaden. De gegevens worden automatisch ingevuld.
                <br />
                <span className="font-medium text-blue-600">Tip voor HTML:</span> Open de advertentiepagina, druk op <kbd className="px-1 py-0.5 bg-slate-200 rounded text-xs">Ctrl+S</kbd>, kies <strong>"Webpagina, compleet"</strong> en selecteer daarna alle bestanden uit de map (HTML + afbeeldingen-map).
              </>
            )}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.html,.htm,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="screenshot-upload"
            multiple
          />

          {!preview && (
            <label
              htmlFor="screenshot-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              Bestand Kiezen
            </label>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="relative">
                {preview === 'html' ? (
                  <div className="bg-slate-100 rounded-lg border border-slate-200 p-8 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <p className="text-slate-700 font-medium">HTML bestand geüpload</p>
                      {uploadedFiles.size > 0 && (
                        <p className="text-sm text-slate-600 mt-2">
                          + {uploadedFiles.size} afbeelding{uploadedFiles.size !== 1 ? 'en' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ) : preview === 'pdf' ? (
                  <div className="bg-slate-100 rounded-lg border border-slate-200 p-8 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-red-500 mx-auto mb-2" />
                      <p className="text-slate-700 font-medium">PDF bestand geüpload</p>
                      {currentPdfFile && (
                        <p className="text-sm text-slate-600 mt-2">
                          {currentPdfFile.name} ({(currentPdfFile.size / 1024).toFixed(0)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                ) : preview === 'multiple-images' ? (
                  <div className="bg-slate-100 rounded-lg border border-slate-200 p-8 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                      <p className="text-slate-700 font-medium">Meerdere screenshots geüpload</p>
                      <p className="text-sm text-slate-600 mt-2">
                        Alle screenshots worden gecombineerd geanalyseerd
                      </p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-slate-200"
                  />
                )}
                <button
                  onClick={clearPreview}
                  disabled={analyzing}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {analyzing && (
                <div className="flex items-center gap-3 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Bezig met analyseren van {preview === 'html' ? 'HTML bestand' : preview === 'pdf' ? 'PDF bestand' : preview === 'multiple-images' ? 'screenshots' : 'screenshot'}...</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Gegevens succesvol ingevuld!</span>
                </div>
              )}

              {uploadingPhotos && (
                <div className="flex items-center gap-3 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">{photosMessage}</span>
                </div>
              )}

              {!uploadingPhotos && photosMessage && (
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{photosMessage}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {uploadErrorLog.length > 0 && (
                <div className="mt-2 border border-red-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setErrorLogExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {uploadErrorLog.length} foto{uploadErrorLog.length !== 1 ? "'s" : ''} mislukt — klik voor details
                    </span>
                    {errorLogExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {errorLogExpanded && (
                    <div className="bg-white p-3 space-y-3 max-h-72 overflow-y-auto text-xs font-mono">
                      <button
                        onClick={() => {
                          const lines = uploadErrorLog.map(e => {
                            const attemptLines = e.attempts.map(a =>
                              `  poging ${a.attempt} [${a.timestamp}] (${a.type}): ${a.error}`
                            ).join('\n');
                            return `${e.filename} (${(e.filesize / 1024).toFixed(1)} KB)\n${attemptLines}`;
                          }).join('\n\n');
                          const header = `Upload error log — ${new Date().toLocaleString('nl-NL')}\nURL: ${window.location.href}\nUser-Agent: ${navigator.userAgent}\n\n`;
                          navigator.clipboard.writeText(header + lines);
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
                      >
                        <Copy className="w-3 h-3" /> Kopieer log voor support
                      </button>

                      {uploadErrorLog.map((entry, i) => (
                        <div key={i} className="border-l-2 border-red-300 pl-3">
                          <div className="font-semibold text-gray-800">{entry.filename} <span className="text-gray-400 font-normal">({(entry.filesize / 1024).toFixed(1)} KB)</span></div>
                          {entry.attempts.map((a, j) => (
                            <div key={j} className={`mt-1 ${a.type === 'network' ? 'text-orange-600' : a.type === 'storage' ? 'text-red-600' : a.type === 'database' ? 'text-purple-600' : 'text-gray-600'}`}>
                              poging {a.attempt} — <span className="bg-gray-100 px-1 rounded">{a.type}</span> — {a.error}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
