import { CustomError } from './customError';
import { ErrorStructureInstance } from '../middlewares/errorHandler';

export class NotAuthorizedError extends CustomError {
    statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 401;
        Object.setPrototypeOf(this, NotAuthorizedError.prototype);
    }
    serializeErrors(): ErrorStructureInstance[] {
        return [
            {
                message: this.message
            }
        ];
    }
}
