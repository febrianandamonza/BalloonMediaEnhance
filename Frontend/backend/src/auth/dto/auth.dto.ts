import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
