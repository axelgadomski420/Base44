import { HttpInterceptorFn } from '@angular/common/http';

export const HTTP_INTERCEPTOR: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('purre_token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : req;
  return next(authReq);
};