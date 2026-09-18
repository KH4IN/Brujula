import type { AuthError } from '@supabase/supabase-js';

export function authMessage(error: AuthError): string {
  switch(error.code){
    case 'over_email_send_rate_limit':
      return 'Se ha alcanzado el límite de correos de este proyecto. Espera antes de solicitar otro. Puedes corregir el correo aquí; con el servicio de correo integrado de Supabase no se pueden enviar más confirmaciones hasta que se renueve el cupo.';
    case 'over_request_rate_limit':
    case 'request_timeout':
      return 'Hay demasiados intentos seguidos o la conexión ha tardado demasiado. Espera unos minutos y vuelve a intentarlo; podrás cambiar el correo cuando quieras.';
    case 'email_address_not_authorized':
      return 'Supabase solo permite enviar confirmaciones a correos autorizados con su servicio integrado. Se necesita configurar un proveedor SMTP para abrir el registro a otros correos.';
    case 'email_not_confirmed':
      return 'Aún falta confirmar este correo. Revisa tu bandeja de entrada y el correo no deseado.';
    case 'invalid_credentials':
      return 'No se pudo verificar el correo o el código. Comprueba las seis cifras e inténtalo de nuevo.';
    case 'otp_expired':
      return 'El código ha caducado o ya se ha usado. Solicita otro cuando termine la espera.';
    case 'otp_disabled':
      return 'El acceso por código está desactivado en Supabase. Revisa la configuración de autenticación.';
    case 'weak_password':
      return 'Usa una contraseña más segura, de al menos 8 caracteres.';
    case 'email_address_invalid':
      return 'Revisa el formato del correo electrónico.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Si ya tienes una cuenta, inicia sesión con ese correo.';
    default:
      return error.status===429?'Demasiados intentos. Espera unos minutos y vuelve a probar.':
        'No se pudo completar el acceso. Comprueba la conexión y vuelve a intentarlo.';
  }
}
