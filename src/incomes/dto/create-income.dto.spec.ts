import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateIncomeDto } from './create-income.dto';

describe('CreateIncomeDto', () => {
  const validateDto = (body: Record<string, unknown>) =>
    validate(plainToInstance(CreateIncomeDto, body));

  it('deve aceitar includeInBalance boolean opcional', async () => {
    await expect(
      validateDto({
        amount: 120,
        description: 'Reembolso mercado',
        month: '2025-05',
      }),
    ).resolves.toHaveLength(0);

    await expect(
      validateDto({
        amount: 120,
        description: 'Reembolso mercado',
        month: '2025-05',
        includeInBalance: true,
      }),
    ).resolves.toHaveLength(0);
  });

  it('deve rejeitar includeInBalance como string', async () => {
    const errors = await validateDto({
      amount: 100,
      description: 'Teste invalido',
      month: '2025-05',
      includeInBalance: 'true',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'includeInBalance',
        }),
      ]),
    );
  });
});
