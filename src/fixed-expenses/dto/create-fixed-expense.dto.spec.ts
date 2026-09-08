import { TransactionType } from '@prisma/client';
import { validate } from 'class-validator';
import { CreateFixedExpenseDto } from './create-fixed-expense.dto';

const makeDto = (): CreateFixedExpenseDto =>
  Object.assign(new CreateFixedExpenseDto(), {
    name: 'Assinatura',
    amount: 90,
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
    paymentMethod: TransactionType.CREDIT,
    chargeDay: 7,
  });

describe('CreateFixedExpenseDto', () => {
  it('deve aceitar chargeDay inteiro entre 1 e 31', async () => {
    await expect(validate(makeDto())).resolves.toHaveLength(0);
  });

  it.each([undefined, 0, 32, 7.5])(
    'deve rejeitar chargeDay invalido: %s',
    async (chargeDay) => {
      const dto = makeDto();

      Object.assign(dto, { chargeDay });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );
});
