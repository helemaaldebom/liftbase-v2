import { X, ArrowRight } from 'lucide-react';

interface EquipmentTypeSelectorProps {
  onSelect: (type: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

type EquipmentType = 'heavy_duty_forklift' | 'empty_container_handler' | 'reachstacker' | 'terminal_tractor' | 'general_equipment';

export function EquipmentTypeSelector({
  onSelect,
  onClose,
  title = 'Selecteer type equipment',
  description = 'Kies het type equipment waarvoor je marktdata wilt invoeren.'
}: EquipmentTypeSelectorProps) {
  const equipmentTypes = [
    {
      id: 'heavy_duty_forklift' as EquipmentType,
      label: 'Heavy Duty Forklifts',
      iconPath: '/icons_2024_tekengebied_1_kopie_6.png',
    },
    {
      id: 'empty_container_handler' as EquipmentType,
      label: 'Empty Container Handlers',
      iconPath: '/ICONS_2024_Tekengebied 1 kopie 8.png',
    },
    {
      id: 'reachstacker' as EquipmentType,
      label: 'Reachstackers',
      iconPath: '/icons_2024_tekengebied_1_kopie_5.png',
    },
    {
      id: 'terminal_tractor' as EquipmentType,
      label: 'Terminal Tractors',
      iconPath: '/ICONS_2024_Tekengebied 1 kopie 7.png',
    },
    {
      id: 'general_equipment' as EquipmentType,
      label: 'Overige',
      iconPath: '/icons_2024_tekengebied_1_kopie_6.png',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6">
            {description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onSelect(type.id)}
                className="group relative p-8 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="p-6 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition flex items-center justify-center">
                  <img
                    src={type.iconPath}
                    alt={type.label}
                    className="w-20 h-20 object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  {type.label}
                </h3>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all absolute top-4 right-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
