import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  reference: string;
}
