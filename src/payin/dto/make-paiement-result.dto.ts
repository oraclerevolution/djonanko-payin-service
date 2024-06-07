import { Payin } from '../entities/paiement.entity';
import { QueryResponse } from '../enums/QueryResponse.enum';

export class makePaiementResultDto {
  paiement: Payin;
  status: QueryResponse;
}
