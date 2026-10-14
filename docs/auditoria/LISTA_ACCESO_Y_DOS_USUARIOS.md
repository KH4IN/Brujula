# Lista de comprobación: acceso y dos usuarios (pasos A2 y A4)

Para el fundador. **Solo en pruebas**: vista previa de `staging`
(https://brujula-finanzas-git-staging-kh4ins-projects.vercel.app/), conectada a «Brújula
pruebas». Usa correos de prueba tuyos y datos inventados; nunca tu cuenta real ni
movimientos reales. En pruebas no hay Google: solo correo y contraseña.

Apunta en cada punto ✅, ❌ (con lo que viste) o «no probado». Con eso cierro el informe
de la fase 2.

## A2 · Acceso

1. **Registro.** Crea la cuenta A con un correo de prueba. ¿Llega el correo de
   confirmación y, al confirmar, entras?
2. **Entrar y salir.** Cierra sesión y vuelve a entrar con la contraseña.
3. **Contraseña olvidada.** Pide recuperar la contraseña desde la pantalla de acceso.
   ¿Llega el correo, puedes poner una nueva y entras con ella?
4. **Datos de invitado.** En una ventana privada, sin entrar, anota dos movimientos
   inventados. Después entra con la cuenta A. ¿Aparecen esos dos movimientos en la cuenta,
   sin duplicarse?
5. **Salir con cambios sin subir.** Desconecta la red, anota un movimiento y cierra sesión.
   *Nota:* este aviso (PR #73) está en `main`, pero todavía no en `staging`; si no aparece,
   apúntalo como «no está en staging».

## A4 · Dos usuarios y dos dispositivos

6. **Cada uno lo suyo.** Crea la cuenta B en otro navegador. A anota «Prueba de A, 11 €».
   En B no debe verse nada de A. Comprueba también al revés.
7. **Mismo usuario en dos sitios.** Abre la cuenta A en el móvil y en el ordenador. Anota
   un movimiento en uno; tras «Sincronizar ahora» en el otro, ¿aparece?
8. **Editar a la vez.** Con la cuenta A en los dos: sin red en el móvil, cambia el importe
   de un movimiento; en el ordenador, cambia el mismo movimiento a otro importe. Vuelve a
   conectar el móvil y sincroniza los dos. ¿Qué importe queda? ¿Desaparece o se duplica algo?
9. **Borrar en uno y editar en otro.** Igual que el 8, pero borrando en un sitio y
   editando en el otro. ¿Qué pasa?

Las pruebas 8 y 9 no tienen respuesta «correcta» decidida: sirven para saber cómo se
comporta hoy y decidir si hay que avisar del conflicto.
