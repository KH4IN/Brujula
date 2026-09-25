import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { supabase } from '../data';
import { authMessage } from '../auth';

// Test project has no Google OAuth provider; keep the production flow untouched.
const googleOAuthEnabled = false;

export function Auth({onReady,onClose,recovering,managePassword}:{onReady:()=>void,onClose:()=>void,recovering:boolean,managePassword:boolean}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [repeatPassword,setRepeatPassword]=useState('');
  const [mode,setMode]=useState<'login'|'link'|'register'|'set-password'|'forgot'|'reset'>(recovering?'reset':managePassword?'set-password':'login');
  const [info,setInfo]=useState('');
  const [sentEmail,setSentEmail]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [retryAt,setRetryAt]=useState(0);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{
    if(!retryAt)return;
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[retryAt]);
  const seconds=Math.max(0,Math.ceil((retryAt-now)/1000));
  useEffect(()=>{if(recovering)setMode('reset')},[recovering]);
  function switchMode(next:typeof mode){setMode(next);setSentEmail('');setPassword('');setRepeatPassword('');setInfo('');setError('')}
  async function passwordAction(e:FormEvent){
    e.preventDefault();
    if(loading||!supabase)return;
    setLoading(true);setError('');setInfo('');
    const address=email.trim().toLowerCase();
    try{
      if(mode==='login'){
        const {data,error:loginError}=await supabase.auth.signInWithPassword({email:address,password});
        if(loginError||!data.session){setError(loginError?.code==='invalid_credentials'?'Correo o contraseña incorrectos. También puedes entrar con un enlace.':loginError?authMessage(loginError):'No se pudo iniciar sesión.');return}
        setPassword('');onReady();
      }else if(mode==='register'){
        if(password.length<8){setError('La contraseña debe tener al menos 8 caracteres.');return}
        if(password!==repeatPassword){setError('Las contraseñas no coinciden.');return}
        const {data,error:signupError}=await supabase.auth.signUp({email:address,password,options:{emailRedirectTo:window.location.origin}});
        if(signupError){setError(authMessage(signupError));return}
        setPassword('');setRepeatPassword('');
        if(data.session){onReady();return}
        setInfo('Cuenta solicitada. Si se requiere confirmar el correo, recibirás un enlace en esa dirección. Revisa también el correo no deseado.');
      }else if(mode==='forgot'){
        const {error:resetError}=await supabase.auth.resetPasswordForEmail(address,{redirectTo:window.location.origin});
        if(resetError){setError(authMessage(resetError));return}
        setInfo('Si esa dirección tiene una cuenta, recibirás un enlace para cambiar la contraseña. Revisa también el correo no deseado.');
      }else if(mode==='reset'||mode==='set-password'){
        const {error:updateError}=await supabase.auth.updateUser({password});
        if(updateError){setError(authMessage(updateError));return}
        setPassword('');onReady();
      }
    }catch{setError('No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.')}
    finally{setLoading(false)}
  }
  async function signInGoogle(){
    if(loading||!supabase)return;
    setLoading(true);setError('');
    try{
      const {error:googleError}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
      if(googleError)setError(authMessage(googleError));
    }catch{setError('No se pudo abrir el acceso con Google. Prueba el enlace por correo o la contraseña.')}
    finally{setLoading(false)}
  }
  async function sendLink(address:string){
    if(loading)return;
    const clean=address.trim().toLowerCase();
    setLoading(true);setError('');
    try{
      const {error:sendError}=await supabase!.auth.signInWithOtp({
        email:clean,
        options:{shouldCreateUser:mode==='register',emailRedirectTo:window.location.origin}
      });
      if(sendError){setError(authMessage(sendError));return}
      setSentEmail(clean);
      setNow(Date.now());setRetryAt(Date.now()+60000);
    }catch{
      setError('No se pudo solicitar el enlace. Comprueba la conexión y vuelve a intentarlo.');
    }finally{setLoading(false)}
  }
  useEffect(()=>{
    if(!supabase)return;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_IN'&&!recovering)onReady();
    });
    return ()=>subscription.unsubscribe();
  },[onReady,recovering]);
  return <div className="auth-overlay"><div className="auth-page">
    <button className="auth-close icon-button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button>
    <div className="auth-decor"><div className="brand"><div className="brand-symbol">✳</div><div className="brand-name">brújula<span>.</span><small>FINANZAS PERSONALES</small></div></div><div className="auth-message"><span>UN POCO MÁS DE CLARIDAD, CADA DÍA</span><h1>Tu dinero tiene una historia.<br/><em>Entiéndela mejor.</em></h1><p>Organiza tus gastos, pon límites que puedas cumplir y descubre lo que de verdad importa.</p></div><div className="auth-bottom">✳ &nbsp; Un lugar tranquilo para tus finanzas.</div></div>
    <div className="auth-panel"><div className="auth-box"><div className="auth-mobile-brand">✳ brújula.</div><span className="section-kicker">BIENVENIDO A BRÚJULA</span><h2>{sentEmail?'Revisa tu correo.':mode==='reset'||mode==='set-password'?'Elige tu contraseña.':mode==='forgot'?'Recupera tu acceso.':mode==='register'?'Crea tu cuenta.':'Entra en tu espacio.'}</h2>
      {sentEmail?<><p>Si puede enviarse a <strong>{sentEmail}</strong>, recibirás un enlace para abrir Brújula. Puedes abrirlo en otro dispositivo.</p>
        <div className="auth-toggle"><button type="button" disabled={loading||seconds>0} onClick={()=>void sendLink(sentEmail)}>{seconds>0?`Solicitar otro enlace en ${seconds} s`:'Solicitar otro enlace'}</button></div>
        <div className="auth-toggle"><button type="button" onClick={()=>{setSentEmail('');setError('')}}>Cambiar correo o método</button></div>
      </>:<>
        {mode!=='reset'&&mode!=='forgot'&&mode!=='set-password'&&<div className="auth-methods"><button type="button" className={mode==='register'?'':'active'} onClick={()=>switchMode('login')}>Iniciar sesión</button><button type="button" className={mode==='register'?'active':''} onClick={()=>switchMode('register')}>Registrarse</button></div>}
        <p>{mode==='register'?'Crea tu cuenta con correo y contraseña. Puede que tengas que confirmar tu dirección mediante un enlace.':mode==='link'?'Recibe un enlace para iniciar sesión, sin contraseña.':mode==='forgot'?'Te enviaremos un enlace para cambiarla.':mode==='reset'||mode==='set-password'?'Elige una contraseña para tu cuenta.':'Entra con tu correo y contraseña.'}</p>
        {(mode==='login'||mode==='register')&&googleOAuthEnabled&&<button type="button" className="secondary-button google-signin" disabled={loading} onClick={()=>void signInGoogle()}>Continuar con Google</button>}
        {mode==='link'?<form onSubmit={e=>{e.preventDefault();void sendLink(email)}}>
          <label>Correo electrónico<input type="email" required autoComplete="email" placeholder="tu@correo.com" value={email} onChange={e=>{setEmail(e.target.value);setError('')}}/></label>
          {error&&<div className="notice" role="alert">{error}</div>}
          <button className="primary-button form-submit" disabled={loading}>{loading?'Solicitando…':'Enviar enlace'} <ArrowRight size={18}/></button>
        </form>:<form onSubmit={passwordAction}>
          {mode!=='reset'&&mode!=='set-password'&&<label>Correo electrónico<input type="email" required autoComplete="email" placeholder="tu@correo.com" value={email} onChange={e=>{setEmail(e.target.value);setError('')}}/></label>}
          {mode!=='forgot'&&<label>Contraseña<input type="password" required minLength={mode==='login'?undefined:8} maxLength={256} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={mode==='login'?'Tu contraseña':'Al menos 8 caracteres'} value={password} onChange={e=>{setPassword(e.target.value);setError('')}}/></label>}
          {mode==='register'&&<label>Repite la contraseña<input type="password" required minLength={8} maxLength={256} autoComplete="new-password" placeholder="Vuelve a escribir la contraseña" value={repeatPassword} onChange={e=>{setRepeatPassword(e.target.value);setError('')}}/></label>}
          {info&&<p role="status" className="form-hint">{info}</p>}
          {error&&<div className="notice" role="alert">{error}</div>}
          <button className="primary-button form-submit" disabled={loading}>{loading?'Espera…':mode==='login'?'Iniciar sesión':mode==='register'?'Crear cuenta':mode==='forgot'?'Enviar enlace':'Guardar contraseña'} <ArrowRight size={18}/></button>
        </form>}
        {mode==='login'&&<div className="auth-toggle"><button type="button" onClick={()=>switchMode('link')}>Entrar con enlace por correo</button><button type="button" onClick={()=>switchMode('forgot')}>He olvidado mi contraseña</button></div>}
        {(mode==='link'||mode==='forgot')&&<div className="auth-toggle"><button type="button" onClick={()=>switchMode('login')}>Volver a iniciar sesión</button></div>}
      </>}
    </div></div>
  </div></div>;
}
