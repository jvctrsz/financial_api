import { BadRequestException } from '@nestjs/common';

export const assertClosingDayIsValid = (closingDay: number) => {
  if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
    throw new BadRequestException(
      'O dia de fechamento deve ser um número inteiro entre 1 e 31.',
    );
  }
};
