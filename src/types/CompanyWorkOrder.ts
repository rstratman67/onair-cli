export interface WorkOrderNestedAircraftType {
  DisplayName?: string;
  TypeName?: string;
  ICAO?: string;
  Icao?: string;
  IcaoCode?: string;
}

export interface WorkOrderNestedAircraft {
  Id?: string;
  Identifier?: string;
  AircraftType?: WorkOrderNestedAircraftType;
}

export interface CompanyWorkOrder extends Record<string, unknown> {
  Id?: string;
  Status?: string | number;
  CurrentStatus?: string;
  WorkOrderStatus?: string;
  State?: string;
  Description?: string;
  Name?: string;
  Title?: string;
  Category?: string;
  AircraftIdentifier?: string;
  AircraftIcao?: string;
  AircraftICAO?: string;
  AircraftId?: string;
  Aircraft?: WorkOrderNestedAircraft;
  AircraftType?: WorkOrderNestedAircraftType;
  AssignedCrew?: unknown;
  AssignedCrews?: unknown;
  Crew?: unknown;
  Crews?: unknown;
  Employees?: unknown;
}
