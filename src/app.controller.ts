import {
  Controller,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}

  @Get('/generate')
  @UseInterceptors(FileInterceptor('file'))
  async generate(
    @Query('firstname') firstname: string,
    @Query('lastname') lastname: string,
    @Query('chill') chill: string,
    @Query('sunday') sunday: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<string> {
    return await this.service.generate(
      file,
      firstname,
      lastname,
      chill.split(',').map((day) => parseInt(day)),
      sunday === '1',
    );
  }
}
