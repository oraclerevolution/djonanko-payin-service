import { QueryResponse } from '../enums/QueryResponse.enum';

export interface CreateHistoriqueResultDto {
  historique: any;
  status: QueryResponse;
}
