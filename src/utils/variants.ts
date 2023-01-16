
export type Some<T> = { type: 'Some', value: T }
export type None = { type: 'None' }
export type Option<T> =
    | Some<T>
    | None
export const Some = <T extends unknown>(value: T): Option<T> => ({ type: 'Some', value });
export const None = <T extends unknown>(): Option<T> => ({ type: 'None' });
export const hasSome = (option: Option<any>) => option.type == 'Some';
export const isNone = (option: Option<any>) => option.type == 'None';
//export const unwrap = <T extends unknown>(option: Option<T>) => option.type == 'Some' ? option.value : (() => {throw `unwrapped a non-Some option, ${option}`})();



export type Ok<T> = { type: 'Ok', value: T }
export type Error = { type: 'Error', error: any }
export type Result<T> = 
| Ok<T>
| Error

export const Ok = <T extends unknown>(value: T): Result<T> => ({ type: 'Ok', value })
export const Error = (error: any): Result<any> => ({ type: 'Error', error })
export const isOk = (result: Result<any>) => result.type == 'Ok';
export const isError = (result: Result<any>) => result.type == 'Error';


export const unwrap = <T extends unknown>(w: Option<T> | Result<T>) => w.type == 'Some' || w.type == 'Ok' ? w.value : (() => {throw `failed to unwrap ${w}`})();