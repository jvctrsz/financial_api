import { FindMeUserService } from './services/find-me-user.service';
import { UpdateUserService } from './services/update-user.service';
import { UsersModule } from './users.module';

describe('UsersModule', () => {
  it('deve registrar apenas providers ativos de usuario', () => {
    const providers = Reflect.getMetadata('providers', UsersModule);

    expect(providers).toContain(FindMeUserService);
    expect(providers).toContain(UpdateUserService);
    expect(providers).toHaveLength(2);
  });
});
