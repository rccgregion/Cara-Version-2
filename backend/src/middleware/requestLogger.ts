import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';

export const requestLogger = (logger: Logger) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'error' : 'info';

      logger[level as 'info' | 'error']({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userId: (req as any).user?.id,
      });
    });

    next();
  };
};
