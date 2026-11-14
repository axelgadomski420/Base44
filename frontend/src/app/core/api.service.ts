import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Observable<T> {
    return this.http.get<T>(environment.apiUrl + path, { params: this.toParams(params) })
      .pipe(this.err());
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(environment.apiUrl + path, body).pipe(this.err());
  }

  postMultipart<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<T>(environment.apiUrl + path, form).pipe(this.err());
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(environment.apiUrl + path, body).pipe(this.err());
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(environment.apiUrl + path).pipe(this.err());
  }

  private toParams(params?: Record<string, string | number | boolean | undefined>): HttpParams | undefined {
    if (!params) return undefined;
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  private err() {
    return catchError((e: { status?: number; error?: { code?: string; message?: string; details?: unknown } }) =>
      throwError(() => new ApiError(
        e.status ?? 0,
        e.error?.code ?? 'NETWORK_ERROR',
        e.error?.message ?? 'Błąd połączenia z serwerem.',
        e.error?.details
      )));
  }
}