import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type SocketHandler = (data: any) => void;
interface SocketClient { connected:boolean; on:(event:string,handler:SocketHandler)=>SocketClient; off:(event:string,handler:SocketHandler)=>SocketClient; emit:(event:string,...args:any[])=>SocketClient; disconnect:()=>SocketClient; connect:()=>SocketClient; joinShowroom?:()=>void; leaveShowroom?:()=>void; }
interface SocketChannel { socket:SocketClient; room:string; events:Array<[string,SocketHandler]>; }
interface SocketContextValue extends SocketClient { connected:boolean; socket: SocketClient | null; joinAuction:(carId:string,handlers?:{onBid?:SocketHandler;onCarUpdate?:SocketHandler})=>SocketChannel|undefined; joinNotifications:(handlers?:{onNotification?:SocketHandler})=>SocketChannel|null; joinMessages:(conversationId:string,handlers?:{onMessage?:SocketHandler})=>SocketChannel|undefined; joinInspection:(inspectionId:string,handlers?:{onUpdate?:SocketHandler})=>SocketChannel|undefined; leaveChannel:(channel:SocketChannel)=>void; }
declare global { interface Window { io?: (url:string,options?:Record<string,any>)=>SocketClient; } }
const SocketCtx=createContext<SocketContextValue|null>(null);
const socketUrl=()=>import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD?'https://api.kayad.space':'http://localhost:5000');
let loaderPromise:Promise<void>|null=null;
function loadSocketIoClient(){
 if(window.io)return Promise.resolve(); if(loaderPromise)return loaderPromise;
 loaderPromise=new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-kayad-socketio]') as HTMLScriptElement|null; if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Unable to load Socket.IO client')),{once:true});return;} const script=document.createElement('script'); script.src=`${socketUrl()}/socket.io/socket.io.js`;script.async=true;script.dataset.kayadSocketio='true';script.onload=()=>resolve();script.onerror=()=>reject(new Error(`Unable to load Socket.IO client from ${script.src}`));document.head.appendChild(script);}); return loaderPromise;
}
export function SocketProvider({children}:{children:ReactNode}){
 const {isAuth}=useAuth(); const [connected,setConnected]=useState(false); const socketRef=useRef<SocketClient|null>(null); const subscriptions=useRef<SocketChannel[]>([]);
 useEffect(()=>{let cancelled=false; if(!isAuth){socketRef.current?.disconnect();socketRef.current=null;setConnected(false);return()=>{cancelled=true};}
  void loadSocketIoClient().then(()=>{if(cancelled||!window.io)return;const s=window.io(socketUrl(),{withCredentials:true,transports:['websocket','polling'],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:1000});socketRef.current=s;const c=()=>setConnected(true),d=()=>setConnected(false);s.on('connect',c);s.on('disconnect',d);if(s.connected)setConnected(true);}).catch(e=>{if(!cancelled){console.warn('[KAYAD] Realtime unavailable:',e);setConnected(false);}});
  return()=>{cancelled=true;subscriptions.current.forEach(ch=>ch.events.forEach(([ev,h])=>ch.socket.off(ev,h)));subscriptions.current=[];socketRef.current?.disconnect();socketRef.current=null;setConnected(false)};
 },[isAuth]);
 const on=useCallback((event:string,handler:SocketHandler)=>{socketRef.current?.on(event,handler);return()=>socketRef.current?.off(event,handler)},[]);
 const off=useCallback((event:string,handler:SocketHandler)=>{socketRef.current?.off(event,handler);return socketRef.current},[]);
 const emit=useCallback((event:string,...args:any[])=>{socketRef.current?.emit(event,...args);return socketRef.current},[]);
 const joinAuction=useCallback((carId:string,handlers:{onBid?:SocketHandler;onCarUpdate?:SocketHandler}={})=>{const s=socketRef.current;if(!s||!carId)return undefined;s.emit('joinAuction',carId);const events:Array<[string,SocketHandler]>=[];if(handlers.onBid){s.on('bidUpdate',handlers.onBid);events.push(['bidUpdate',handlers.onBid]);}if(handlers.onCarUpdate){s.on('auctionResync',handlers.onCarUpdate);s.on('auctionPhase',handlers.onCarUpdate);events.push(['auctionResync',handlers.onCarUpdate],['auctionPhase',handlers.onCarUpdate]);}const ch={socket:s,room:`car_${carId}`,events};subscriptions.current.push(ch);return ch;},[]);
 const joinNotifications=useCallback((handlers:{onNotification?:SocketHandler}={})=>{const s=socketRef.current;if(!s)return null;const events:Array<[string,SocketHandler]>=[];if(handlers.onNotification){s.on('notification',handlers.onNotification);events.push(['notification',handlers.onNotification]);}const ch={socket:s,room:'user_notifications',events};subscriptions.current.push(ch);return ch;},[]);
 const joinMessages=useCallback((conversationId:string,handlers:{onMessage?:SocketHandler}={})=>{const s=socketRef.current;if(!s||!conversationId)return undefined;s.emit('joinChat',conversationId);const events:Array<[string,SocketHandler]>=[];if(handlers.onMessage){s.on('newMessage',handlers.onMessage);events.push(['newMessage',handlers.onMessage]);}const ch={socket:s,room:`chat_${conversationId}`,events};subscriptions.current.push(ch);return ch;},[]);
 const joinInspection=useCallback((inspectionId:string,handlers:{onUpdate?:SocketHandler}={})=>{const s=socketRef.current;if(!s||!inspectionId)return undefined;s.emit('joinInspection',inspectionId);const events:Array<[string,SocketHandler]>=[];if(handlers.onUpdate){s.on('inspectionUpdated',handlers.onUpdate);s.on('inspectionResync',handlers.onUpdate);events.push(['inspectionUpdated',handlers.onUpdate],['inspectionResync',handlers.onUpdate]);}const ch={socket:s,room:`inspection_${inspectionId}`,events};subscriptions.current.push(ch);return ch;},[]);
 const leaveChannel=useCallback((ch:SocketChannel)=>{if(!ch)return;ch.events.forEach(([ev,h])=>ch.socket.off(ev,h));if(ch.room.startsWith('chat_'))ch.socket.emit('leaveChat',ch.room.slice(5));if(ch.room.startsWith('car_'))ch.socket.emit('leaveAuction',ch.room.slice(4));subscriptions.current=subscriptions.current.filter(x=>x!==ch)},[]);
 const joinShowroom=useCallback(()=>socketRef.current?.emit('joinShowroom'),[]),leaveShowroom=useCallback(()=>socketRef.current?.emit('leaveShowroom'),[]);
 const value={connected,socket:socketRef.current,on,off,emit,disconnect:()=>socketRef.current?.disconnect(),connect:()=>socketRef.current?.connect(),joinShowroom,leaveShowroom,joinAuction,joinNotifications,joinMessages,joinInspection,leaveChannel} as SocketContextValue;
 return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>;
}
export const useSocket=()=>{const c=useContext(SocketCtx);if(!c)throw new Error('useSocket must be used within a SocketProvider');return c};
