import { IsBoolean, IsDefined } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsDefined()
  @IsBoolean()
  includeIncomesInBalance: boolean;
}
