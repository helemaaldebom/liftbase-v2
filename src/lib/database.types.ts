export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      dossiers: {
        Row: {
          id: string
          dossier_number: string
          dossier_datum: string | null
          title: string
          description: string | null
          equipment_type: string
          brand: string | null
          model: string | null
          year: number | null
          condition: string | null
          location: string | null
          estimated_value: number | null
          status: string
          created_by: string
          assigned_to: string | null
          created_at: string
          updated_at: string
          merk: string | null
          type: string | null
          bouwjaar: number | null
          serienummer: string | null
          uren: number | null
          capaciteit: number | null
          hefhoogte: number | null
          verkoopdatum: string | null
          land: string | null
          locatie: string | null
          is_marktdata: boolean
          brandstof: string | null
          lastzwaartepunt: number | null
          vrije_hef: number | null
          masttype: string | null
          aanbouwdeel: string | null
          purchase_price: number | null
          handelsprijs: number | null
          eindklantprijs: number | null
          sale_price: number | null
          sold_at: string | null
          sold_via_platform: string | null
          customer_name: string | null
          latitude: number | null
          longitude: number | null
          customer_id: string | null
        }
        Insert: {
          id?: string
          dossier_number?: string
          dossier_datum?: string | null
          title: string
          description?: string | null
          equipment_type: string
          brand?: string | null
          model?: string | null
          year?: number | null
          condition?: string | null
          location?: string | null
          estimated_value?: number | null
          status?: string
          created_by: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          merk?: string | null
          type?: string | null
          bouwjaar?: number | null
          serienummer?: string | null
          uren?: number | null
          capaciteit?: number | null
          hefhoogte?: number | null
          verkoopdatum?: string | null
          land?: string | null
          locatie?: string | null
          is_marktdata?: boolean
          brandstof?: string | null
          lastzwaartepunt?: number | null
          vrije_hef?: number | null
          masttype?: string | null
          aanbouwdeel?: string | null
          purchase_price?: number | null
          handelsprijs?: number | null
          eindklantprijs?: number | null
          sale_price?: number | null
          sold_at?: string | null
          sold_via_platform?: string | null
          customer_name?: string | null
          latitude?: number | null
          longitude?: number | null
          customer_id?: string | null
        }
        Update: {
          id?: string
          dossier_number?: string
          dossier_datum?: string | null
          title?: string
          description?: string | null
          equipment_type?: string
          brand?: string | null
          model?: string | null
          year?: number | null
          condition?: string | null
          location?: string | null
          estimated_value?: number | null
          status?: string
          created_by?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          merk?: string | null
          type?: string | null
          bouwjaar?: number | null
          serienummer?: string | null
          uren?: number | null
          capaciteit?: number | null
          hefhoogte?: number | null
          verkoopdatum?: string | null
          land?: string | null
          locatie?: string | null
          is_marktdata?: boolean
          brandstof?: string | null
          lastzwaartepunt?: number | null
          vrije_hef?: number | null
          masttype?: string | null
          aanbouwdeel?: string | null
          purchase_price?: number | null
          handelsprijs?: number | null
          eindklantprijs?: number | null
          sale_price?: number | null
          sold_at?: string | null
          sold_via_platform?: string | null
          customer_name?: string | null
          latitude?: number | null
          longitude?: number | null
          customer_id?: string | null
        }
      }
      dossier_attachments: {
        Row: {
          id: string
          dossier_id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dossier_id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dossier_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          file_size?: number
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      forklift_details: {
        Row: {
          id: string
          dossier_id: string
          order_no: string | null
          date: string | null
          brand: string | null
          type: string | null
          power: string | null
          capacity_kg: number | null
          load_center_mm: number | null
          year_of_manufacture: number | null
          hours_on_clock: number | null
          mast: string | null
          mast_type: string | null
          free_lift: string | null
          lift_height_mm: number | null
          serial_no: string | null
          attachment: string | null
          attachment_other: string | null
          remark: string | null
          external_remarks: string | null
          length_total_mm: number | null
          width_total_mm: number | null
          drive_through_height_mm: number | null
          serviceweight_kg: number | null
          cabin_type: string | null
          heater: boolean | null
          airco: boolean | null
          streetlights_front: string | null
          streetlights_rear: string | null
          work_light_front: string | null
          work_light_rear: string | null
          beacon: string | null
          radio: string | null
          extra_lights: string | null
          extra_lights_2: string | null
          wheelbase: string | null
          mirrors: string | null
          mirrors_heated: boolean | null
          seat_brand: string | null
          seat_type_suspension: string | null
          headrest: string | null
          seat_options: string | null
          engine_brand: string | null
          engine_type: string | null
          engine_remark: string | null
          front_axle_brand: string | null
          front_axle_type: string | null
          front_axle_remark: string | null
          rear_axle_brand: string | null
          rear_axle_type: string | null
          rear_axle_remark: string | null
          trans_brand: string | null
          trans_type: string | null
          trans_remark: string | null
          shift_type: string | null
          adblue: string | null
          particle_filter: string | null
          fork_length_mm: number | null
          fork_width_mm: number | null
          fork_height_mm: number | null
          hydraulic_lines: number | null
          no_forks: boolean | null
          tire_size_front: string | null
          tire_size_back: string | null
          tire_type: string | null
          central_greasing_chassis: boolean | null
          customer_fleet_number: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_kg?: number | null
          load_center_mm?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          mast?: string | null
          mast_type?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          serial_no?: string | null
          attachment?: string | null
          attachment_other?: string | null
          remark?: string | null
          external_remarks?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          streetlights_front?: string | null
          streetlights_rear?: string | null
          work_light_front?: string | null
          work_light_rear?: string | null
          beacon?: string | null
          radio?: string | null
          extra_lights?: string | null
          extra_lights_2?: string | null
          wheelbase?: string | null
          mirrors?: string | null
          mirrors_heated?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_brand?: string | null
          rear_axle_type?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          shift_type?: string | null
          adblue?: string | null
          particle_filter?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          hydraulic_lines?: number | null
          no_forks?: boolean | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          tire_type?: string | null
          central_greasing_chassis?: boolean | null
          customer_fleet_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_kg?: number | null
          load_center_mm?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          mast?: string | null
          mast_type?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          serial_no?: string | null
          attachment?: string | null
          attachment_other?: string | null
          remark?: string | null
          external_remarks?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          streetlights_front?: string | null
          streetlights_rear?: string | null
          work_light_front?: string | null
          work_light_rear?: string | null
          beacon?: string | null
          radio?: string | null
          extra_lights?: string | null
          extra_lights_2?: string | null
          wheelbase?: string | null
          mirrors?: string | null
          mirrors_heated?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_brand?: string | null
          rear_axle_type?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          shift_type?: string | null
          adblue?: string | null
          particle_filter?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          hydraulic_lines?: number | null
          no_forks?: boolean | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          tire_type?: string | null
          central_greasing_chassis?: boolean | null
          customer_fleet_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      empty_container_handler_details: {
        Row: {
          id: string
          dossier_id: string
          order_no: string | null
          date: string | null
          brand: string | null
          type: string | null
          power: string | null
          capacity_kg: number | null
          load_center_mm: number | null
          year_of_manufacture: number | null
          hours_on_clock: number | null
          serial_no: string | null
          mast: string | null
          mast_type: string | null
          free_lift: string | null
          lift_height_mm: number | null
          double_box: boolean | null
          double_box_type: string | null
          remark: string | null
          external_remarks: string | null
          engine_brand: string | null
          engine_type: string | null
          engine_remark: string | null
          front_axle_brand: string | null
          front_axle_type: string | null
          front_axle_remark: string | null
          rear_axle_remark: string | null
          trans_brand: string | null
          trans_type: string | null
          trans_remark: string | null
          adblue: boolean | null
          hydraulic_lines: number | null
          attachment: string | null
          attachment_other: string | null
          fork_length_mm: number | null
          fork_width_mm: number | null
          fork_height_mm: number | null
          no_forks: boolean | null
          cabin_type: string | null
          heater: boolean | null
          airco: boolean | null
          radio: boolean | null
          seat_brand: string | null
          seat_type_suspension: string | null
          headrest: string | null
          seat_options: string | null
          length_total_mm: number | null
          width_total_mm: number | null
          drive_through_height_mm: number | null
          serviceweight_kg: number | null
          tire_size_front: string | null
          tire_size_back: string | null
          tire_type: string | null
          central_greasing_chassis: boolean | null
          central_greasing_spreader: boolean | null
          customer_fleet_number: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_kg?: number | null
          load_center_mm?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          serial_no?: string | null
          mast?: string | null
          mast_type?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          double_box?: boolean | null
          double_box_type?: string | null
          remark?: string | null
          external_remarks?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          adblue?: boolean | null
          hydraulic_lines?: number | null
          attachment?: string | null
          attachment_other?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          no_forks?: boolean | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          radio?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          tire_type?: string | null
          central_greasing_chassis?: boolean | null
          central_greasing_spreader?: boolean | null
          customer_fleet_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_kg?: number | null
          load_center_mm?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          serial_no?: string | null
          mast?: string | null
          mast_type?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          double_box?: boolean | null
          double_box_type?: string | null
          remark?: string | null
          external_remarks?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          adblue?: boolean | null
          hydraulic_lines?: number | null
          attachment?: string | null
          attachment_other?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          no_forks?: boolean | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          radio?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          tire_type?: string | null
          central_greasing_chassis?: boolean | null
          central_greasing_spreader?: boolean | null
          customer_fleet_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      reachstacker_details: {
        Row: {
          id: string
          dossier_id: string
          order_no: string | null
          date: string | null
          brand: string | null
          type: string | null
          power: string | null
          capacity_kg: number | null
          load_center_mm: number | null
          capacity_1st_row: number | null
          capacity_2nd_row: number | null
          capacity_3rd_row: number | null
          year_of_manufacture: number | null
          hours_on_clock: number | null
          serial_no: string | null
          mast: string | null
          mast_type: string | null
          free_lift: string | null
          lift_height_mm: number | null
          double_box_type: string | null
          remark: string | null
          external_remarks: string | null
          engine_brand: string | null
          engine_type: string | null
          engine_remark: string | null
          front_axle_brand: string | null
          front_axle_type: string | null
          front_axle_remark: string | null
          rear_axle_remark: string | null
          trans_brand: string | null
          trans_type: string | null
          trans_remark: string | null
          adblue: boolean | null
          hydraulic_lines: number | null
          attachment: string | null
          attachment_other: string | null
          fork_length_mm: number | null
          fork_width_mm: number | null
          fork_height_mm: number | null
          no_forks: boolean | null
          cabin_type: string | null
          heater: boolean | null
          airco: boolean | null
          radio: boolean | null
          seat_brand: string | null
          seat_type_suspension: string | null
          headrest: string | null
          seat_options: string | null
          length_total_mm: number | null
          width_total_mm: number | null
          drive_through_height_mm: number | null
          serviceweight_kg: number | null
          tire_size_front: string | null
          tire_size_back: string | null
          tire_type: string | null
          central_greasing_chassis: boolean | null
          central_greasing_spreader: boolean | null
          stacking_height_8_6: number | null
          stacking_height_9_6: number | null
          customer_fleet_number: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_kg?: number | null
          load_center_mm?: number | null
          capacity_1st_row?: number | null
          capacity_2nd_row?: number | null
          capacity_3rd_row?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          serial_no?: string | null
          mast?: string | null
          mast_type?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          double_box_type?: string | null
          remark?: string | null
          external_remarks?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          adblue?: boolean | null
          hydraulic_lines?: number | null
          attachment?: string | null
          attachment_other?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          no_forks?: boolean | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          radio?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          tire_type?: string | null
          central_greasing_chassis?: boolean | null
          central_greasing_spreader?: boolean | null
          stacking_height_8_6?: number | null
          stacking_height_9_6?: number | null
          customer_fleet_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_kg?: number | null
          load_center_mm?: number | null
          capacity_1st_row?: number | null
          capacity_2nd_row?: number | null
          capacity_3rd_row?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          serial_no?: string | null
          mast?: string | null
          mast_type?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          double_box_type?: string | null
          remark?: string | null
          external_remarks?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          adblue?: boolean | null
          hydraulic_lines?: number | null
          attachment?: string | null
          attachment_other?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          no_forks?: boolean | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          radio?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          tire_type?: string | null
          central_greasing_chassis?: boolean | null
          central_greasing_spreader?: boolean | null
          stacking_height_8_6?: number | null
          stacking_height_9_6?: number | null
          customer_fleet_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      terminal_tractor_details: {
        Row: {
          id: string
          dossier_id: string
          order_no: string | null
          date: string | null
          brand: string | null
          type: string | null
          power: string | null
          capacity_1st_row: number | null
          capacity_2nd_row: number | null
          capacity_3rd_row: number | null
          year_of_manufacture: number | null
          hours_on_clock: number | null
          serial_no: string | null
          mast: string | null
          free_lift: string | null
          lift_height_mm: number | null
          remark: string | null
          external_remarks: string | null
          engine_brand: string | null
          engine_type: string | null
          engine_remark: string | null
          front_axle_brand: string | null
          front_axle_type: string | null
          front_axle_remark: string | null
          rear_axle_remark: string | null
          trans_brand: string | null
          trans_type: string | null
          trans_remark: string | null
          adblue: boolean | null
          hydraulic_lines: number | null
          attachment: string | null
          attachment_other: string | null
          fork_length_mm: number | null
          fork_width_mm: number | null
          fork_height_mm: number | null
          no_forks: boolean | null
          cabin_type: string | null
          heater: boolean | null
          airco: boolean | null
          radio: boolean | null
          seat_brand: string | null
          seat_type_suspension: string | null
          headrest: string | null
          seat_options: string | null
          length_total_mm: number | null
          width_total_mm: number | null
          drive_through_height_mm: number | null
          serviceweight_kg: number | null
          tire_size_front: string | null
          tire_size_back: string | null
          central_greasing_chassis: boolean | null
          fifth_wheel_height_mm: number | null
          wheelbase_mm: number | null
          customer_fleet_number: string | null
          battery_capacity_kwh: number | null
          has_charger: boolean | null
          charger_capacity_kw: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_1st_row?: number | null
          capacity_2nd_row?: number | null
          capacity_3rd_row?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          serial_no?: string | null
          mast?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          remark?: string | null
          external_remarks?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          adblue?: boolean | null
          hydraulic_lines?: number | null
          attachment?: string | null
          attachment_other?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          no_forks?: boolean | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          radio?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          central_greasing_chassis?: boolean | null
          fifth_wheel_height_mm?: number | null
          wheelbase_mm?: number | null
          customer_fleet_number?: string | null
          battery_capacity_kwh?: number | null
          has_charger?: boolean | null
          charger_capacity_kw?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          order_no?: string | null
          date?: string | null
          brand?: string | null
          type?: string | null
          power?: string | null
          capacity_1st_row?: number | null
          capacity_2nd_row?: number | null
          capacity_3rd_row?: number | null
          year_of_manufacture?: number | null
          hours_on_clock?: number | null
          serial_no?: string | null
          mast?: string | null
          free_lift?: string | null
          lift_height_mm?: number | null
          remark?: string | null
          external_remarks?: string | null
          engine_brand?: string | null
          engine_type?: string | null
          engine_remark?: string | null
          front_axle_brand?: string | null
          front_axle_type?: string | null
          front_axle_remark?: string | null
          rear_axle_remark?: string | null
          trans_brand?: string | null
          trans_type?: string | null
          trans_remark?: string | null
          adblue?: boolean | null
          hydraulic_lines?: number | null
          attachment?: string | null
          attachment_other?: string | null
          fork_length_mm?: number | null
          fork_width_mm?: number | null
          fork_height_mm?: number | null
          no_forks?: boolean | null
          cabin_type?: string | null
          heater?: boolean | null
          airco?: boolean | null
          radio?: boolean | null
          seat_brand?: string | null
          seat_type_suspension?: string | null
          headrest?: string | null
          seat_options?: string | null
          length_total_mm?: number | null
          width_total_mm?: number | null
          drive_through_height_mm?: number | null
          serviceweight_kg?: number | null
          tire_size_front?: string | null
          tire_size_back?: string | null
          central_greasing_chassis?: boolean | null
          fifth_wheel_height_mm?: number | null
          wheelbase_mm?: number | null
          customer_fleet_number?: string | null
          battery_capacity_kwh?: number | null
          has_charger?: boolean | null
          charger_capacity_kw?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      photos: {
        Row: {
          id: string
          dossier_id: string | null
          machine_id: string | null
          storage_path: string | null
          filename: string | null
          caption: string | null
          display_order: number | null
          visible_online: boolean
          rotation_degrees: number | null
          category: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          dossier_id?: string | null
          machine_id?: string | null
          storage_path?: string | null
          filename?: string | null
          caption?: string | null
          display_order?: number | null
          visible_online?: boolean
          rotation_degrees?: number | null
          category?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string | null
          machine_id?: string | null
          storage_path?: string | null
          filename?: string | null
          caption?: string | null
          display_order?: number | null
          visible_online?: boolean
          rotation_degrees?: number | null
          category?: string | null
          created_at?: string | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          active: boolean | null
          dealer_id: string | null
          language: string | null
          has_taxatietool_access: boolean | null
          two_fa_enabled: boolean | null
          two_fa_secret: string | null
          phone: string | null
          company_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          role?: string
          active?: boolean | null
          dealer_id?: string | null
          language?: string | null
          has_taxatietool_access?: boolean | null
          two_fa_enabled?: boolean | null
          two_fa_secret?: string | null
          phone?: string | null
          company_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          active?: boolean | null
          dealer_id?: string | null
          language?: string | null
          has_taxatietool_access?: boolean | null
          two_fa_enabled?: boolean | null
          two_fa_secret?: string | null
          phone?: string | null
          company_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      dealers: {
        Row: {
          id: string
          name: string
          user_id: string | null
          email: string | null
          active: boolean | null
          opt_in_email: boolean | null
          machine_types: string[] | null
          age_category: string | null
          auth_user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          user_id?: string | null
          email?: string | null
          active?: boolean | null
          opt_in_email?: boolean | null
          machine_types?: string[] | null
          age_category?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          user_id?: string | null
          email?: string | null
          active?: boolean | null
          opt_in_email?: boolean | null
          machine_types?: string[] | null
          age_category?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bids: {
        Row: {
          id: string
          dossier_id: string | null
          machine_id: string | null
          dealer_id: string | null
          bedrag: number | null
          amount: number | null
          valuta: string | null
          voorwaarden: string | null
          notes: string | null
          status: string | null
          interesse: boolean | null
          sales_price: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dossier_id?: string | null
          machine_id?: string | null
          dealer_id?: string | null
          bedrag?: number | null
          amount?: number | null
          valuta?: string | null
          voorwaarden?: string | null
          notes?: string | null
          status?: string | null
          interesse?: boolean | null
          sales_price?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string | null
          machine_id?: string | null
          dealer_id?: string | null
          bedrag?: number | null
          amount?: number | null
          valuta?: string | null
          voorwaarden?: string | null
          notes?: string | null
          status?: string | null
          interesse?: boolean | null
          sales_price?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      videos: {
        Row: {
          id: string
          dossier_id: string
          storage_path: string
          filename: string
          file_size: number | null
          created_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          storage_path: string
          filename: string
          file_size?: number | null
          created_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          storage_path?: string
          filename?: string
          file_size?: number | null
          created_at?: string | null
          uploaded_by?: string | null
        }
      }
      maintenance_documents: {
        Row: {
          id: string
          dossier_id: string
          storage_path: string
          filename: string
          file_type: string | null
          file_size: number | null
          extracted_data: Json | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          storage_path: string
          filename: string
          file_type?: string | null
          file_size?: number | null
          extracted_data?: Json | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          storage_path?: string
          filename?: string
          file_type?: string | null
          file_size?: number | null
          extracted_data?: Json | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      advertisement_publications: {
        Row: {
          id: string
          dossier_id: string
          platform: string
          status: string
          external_id: string | null
          published_at: string | null
          unpublished_at: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          platform: string
          status?: string
          external_id?: string | null
          published_at?: string | null
          unpublished_at?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          platform?: string
          status?: string
          external_id?: string | null
          published_at?: string | null
          unpublished_at?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      api_credentials: {
        Row: {
          id: string
          platform: string
          credentials: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          platform: string
          credentials: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          platform?: string
          credentials?: Json
          created_at?: string | null
          updated_at?: string | null
        }
      }
      temporary_dossier_access: {
        Row: {
          id: string
          dossier_id: string
          dealer_id: string | null
          access_token: string
          expires_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          dossier_id: string
          dealer_id?: string | null
          access_token: string
          expires_at: string
          created_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string
          dealer_id?: string | null
          access_token?: string
          expires_at?: string
          created_at?: string | null
        }
      }
      price_history: {
        Row: {
          id: string
          dossier_id: string | null
          price_type: string
          old_value: number | null
          new_value: number | null
          changed_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          dossier_id?: string | null
          price_type: string
          old_value?: number | null
          new_value?: number | null
          changed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string | null
          price_type?: string
          old_value?: number | null
          new_value?: number | null
          changed_by?: string | null
          created_at?: string | null
        }
      }
    }
  }
}
