import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class BearerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;

    const bearer = authorization?.split('Bearer ')[1];

    if (bearer === process.env.BEARER) next();
    else res.status(401).send({ message: 'UNAUTHORIZED' });
  }
}
