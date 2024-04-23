import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  generate(): string {
    return 'Hello World!';
  }
}
