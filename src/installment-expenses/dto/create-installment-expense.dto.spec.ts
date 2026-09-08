import { InstallmentPaymentMethod } from '@prisma/client';
import { validate } from 'class-validator';
import { CreateInstallmentExpenseDto } from './create-installment-expense.dto';

const makeDto = (): CreateInstallmentExpenseDto =>
  Object.assign(new CreateInstallmentExpenseDto(), {
    description: 'Notebook',
    totalAmount: 900,
    installmentAmount: 300,
    totalInstallments: 3,
    paymentMethod: InstallmentPaymentMethod.CREDIT_CARD,
    purchaseDate: '2026-04-20',
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
  });

describe('CreateInstallmentExpenseDto', () => {
  it('deve aceitar purchaseDate ISO obrigatoria', async () => {
    await expect(validate(makeDto())).resolves.toHaveLength(0);
  });

  it('deve rejeitar purchaseDate ausente ou invalida', async () => {
    const missingPurchaseDate = makeDto();
    const invalidPurchaseDate = makeDto();

    Object.assign(missingPurchaseDate, { purchaseDate: undefined });
    invalidPurchaseDate.purchaseDate = '20/04/2026';

    await expect(validate(missingPurchaseDate)).resolves.not.toHaveLength(0);
    await expect(validate(invalidPurchaseDate)).resolves.not.toHaveLength(0);
  });
});
