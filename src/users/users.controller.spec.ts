import { UsersController } from './users.controller';

describe('UsersController', () => {
  let findMeUserService: {
    findMe: jest.Mock;
  };
  let updateUserService: {
    updateUser: jest.Mock;
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
    updateUserService = {
      updateUser: jest.fn(),
    };
    controller = new UsersController(
      findMeUserService as never,
      updateUserService as never,
    );
  });

  it('deve chamar FindMeUserService.findMe no GET /users/me', () => {
    const user = { id: 'user-1' };

    findMeUserService.findMe.mockReturnValue(user);

    expect(controller.findMe(request)).toBe(user);
    expect(findMeUserService.findMe).toHaveBeenCalledWith('user-1');
  });

  it('deve chamar UpdateUserService.updateUser no PATCH /users/me', () => {
    const user = { id: 'user-1', name: 'Joao' };
    const dto = { name: 'Joao Atualizado' };

    updateUserService.updateUser.mockReturnValue(user);

    expect(controller.updateMe(request, dto)).toBe(user);
    expect(updateUserService.updateUser).toHaveBeenCalledWith('user-1', dto);
  });

  it('PATCH /users/me nao deve aceitar userId por body', () => {
    const dto = { name: 'Joao', userId: 'user-2' } as never;

    controller.updateMe(request, dto);

    expect(updateUserService.updateUser).toHaveBeenCalledWith('user-1', dto);
  });

  it('nao deve expor metodo de preferencias globais', () => {
    expect(controller).not.toHaveProperty('updatePreferences');
  });
});
