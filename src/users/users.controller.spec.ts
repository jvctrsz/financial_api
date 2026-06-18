import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let findMeUserService: {
    findMe: jest.Mock;
  };
  let updateUserPreferencesService: {
    updatePreferences: jest.Mock;
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
    updateUserPreferencesService = {
      updatePreferences: jest.fn(),
    };
    controller = new UsersController(
      findMeUserService as never,
      updateUserPreferencesService as never,
    );
  });

  it('deve chamar FindMeUserService.findMe no GET /users/me', () => {
    const user = { id: 'user-1' };

    findMeUserService.findMe.mockReturnValue(user);

    expect(controller.findMe(request)).toBe(user);
    expect(findMeUserService.findMe).toHaveBeenCalledWith('user-1');
  });

  it('deve chamar UpdateUserPreferencesService.updatePreferences no PATCH /users/me/preferences', () => {
    const dto: UpdateUserPreferencesDto = {
      includeIncomesInBalance: true,
    };
    const user = { id: 'user-1', includeIncomesInBalance: true };

    updateUserPreferencesService.updatePreferences.mockReturnValue(user);

    expect(controller.updatePreferences(request, dto)).toBe(user);
    expect(
      updateUserPreferencesService.updatePreferences,
    ).toHaveBeenCalledWith('user-1', true);
  });
});
