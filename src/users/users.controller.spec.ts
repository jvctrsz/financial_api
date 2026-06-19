import { UsersController } from './users.controller';

describe('UsersController', () => {
  let findMeUserService: {
    findMe: jest.Mock;
  };
  let controller: UsersController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    findMeUserService = {
      findMe: jest.fn(),
    };
    controller = new UsersController(findMeUserService as never);
  });

  it('deve chamar FindMeUserService.findMe no GET /users/me', () => {
    const user = { id: 'user-1' };

    findMeUserService.findMe.mockReturnValue(user);

    expect(controller.findMe(request)).toBe(user);
    expect(findMeUserService.findMe).toHaveBeenCalledWith('user-1');
  });

  it('não deve expor metodo de preferencias globais', () => {
    expect(controller).not.toHaveProperty('updatePreferences');
  });
});
