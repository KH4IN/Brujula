import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

window.addEventListener('vite:preloadError',event=>{
  // An open tab may still point to a chunk removed by a newer deployment.
  if(!navigator.onLine)return;
  const key='brujula.chunk-reload.v1',now=Date.now(),last=Number(sessionStorage.getItem(key));
  if(last&&now-last<60_000)return;
  sessionStorage.setItem(key,String(now));
  event.preventDefault();
  window.location.reload();
});
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
if('serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{/* Online app remains usable. */})});
