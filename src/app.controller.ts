import {
  Controller,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}

  @Post('/generate')
  @UseInterceptors(FileInterceptor('file'))
  async generate(
    @Query('firstname') firstname: string,
    @Query('lastname') lastname: string,
    @Query('chill') chill: string,
    @Query('sunday') sunday: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res,
  ): Promise<string> {
    const data = await this.service.generate(
      file,
      firstname,
      lastname,
      chill.split(',').map((day) => parseInt(day)),
      sunday === '1',
    );

    return res.status(200).send(data);
  }
}
