import React, { useEffect, useRef, useState } from 'react'
import type { Project } from '../types';
import { BotIcon, EyeIcon, Loader2Icon, PaperclipIcon, SendIcon, UserIcon, XIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/configs/axios';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/error';

interface SidebarProps {
    isMenuOpen: boolean;
    project: Project,
    setProject: (project: Project)=> void;
    isGenerating: boolean;
    setIsGenerating: (isGenerating: boolean)=> void;
}

const Sidebar = ({isMenuOpen, project, setProject, isGenerating, setIsGenerating} : SidebarProps) => {

    const messageRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [input, setInput] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [attachments, setAttachments] = useState<string[]>([])

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/api/user/project/${project.id}`)
            setProject(data.project)
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
            console.log(error);
        }
    }

    const handleRollback = async (versionId: string) => {
        try {
            const confirm = globalThis.confirm('Are you sure you want to rollback to this version?')
            if(!confirm) return;
            setIsGenerating(true)
            const { data } = await api.get(`/api/project/rollback/${project.id}/${versionId}`);
            const { data: data2 } = await api.get(`/api/user/project/${project.id}`);
            toast.success(data.message)
            setProject(data2.project)
            setIsGenerating(false)

        } catch (error: unknown) {
            setIsGenerating(false)
            toast.error(getErrorMessage(error));
            console.log(error);
        }
    }

    const handleRevisions = async (e: React.FormEvent) => {
        e.preventDefault()
        let interval: number | undefined;
        try {
            setIsGenerating(true);
            interval = setInterval(()=>{
                fetchProject();
            },10000)

            let finalMessage = input;
            if (attachments.length > 0) {
                finalMessage = `Use these image assets: ${attachments.join(", ")}. ${input}`;
            }

            const {data} = await api.post(`/api/project/revision/${project.id}`, {message: finalMessage})
            fetchProject();
            toast.success(data.message)
            setInput('')
            setAttachments([])
            clearInterval(interval)
            setIsGenerating(false);
        } catch (error: unknown) {
            setIsGenerating(false);
            toast.error(getErrorMessage(error));
            console.log(error);
            clearInterval(interval)
        }
    }

    useEffect(()=>{
        if(messageRef.current){
            messageRef.current.scrollIntoView({behavior: 'smooth'})
        }
    },[project.conversation.length, isGenerating])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('asset', file);

        try {
            setIsUploading(true);
            const { data } = await api.post('/api/project/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachments([...attachments, data.url]);
            toast.success("Asset uploaded successfully");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to upload asset"));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

  return (
    <div className={`h-full  sm:max-w-sm rounded-xl bg-gray-900 border-gray-800 transition-all ${isMenuOpen ? 'max-sm:w-0 overflow-hidden' : 'w-full'}`}>
      <div className='flex flex-col h-full'>
        {/* Messages container */}
        <div className='flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col gap-4'>
            {[...project.conversation, ...project.versions]
            .sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((message)=>{
                const isMessage = 'content' in message;

                if(isMessage){
                    const msg = message;
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                            {!isUser && (
                                <div className='w-8 h-8 rounded-full bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center'>
                                    <BotIcon className='size-5 text-white'/>
                                </div>
                            )}
                            <div className={`max-w-[80%] p-2 px-4 rounded-2xl shadow-sm text-sm mt-5 leading-relaxed ${isUser ? "bg-linear-to-r from-indigo-500 to-indigo-600 text-white rounded-tr-none" : "rounded-tl-none bg-gray-800 text-gray-100"}`}>
                                {msg.content}
                            </div>
                            {isUser && (
                                <div className='w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center'>
                                    <UserIcon className='size-5 text-gray-200'/>
                                </div>
                            )}
                        </div>
                    )
                }else{
                    const ver = message;
                    return (
                        <div key={ver.id} className='w-4/5 mx-auto my-2 p-3 rounded-xl bg-gray-800 text-gray-100 shadow flex flex-col gap-2'>
                            <div className='text-xs font-medium'>
                                code updated <br /> 
                                <span className='text-gray-500 text-xs font-normal'>
                                    {new Date(ver.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <div className='flex items-center justify-between'>
                                {project.current_version_index === ver.id ? (
                                    <button className='px-3 py-1 rounded-md text-xs bg-gray-700'>Current version</button>
                                ): (
                                    <button onClick={()=> handleRollback(ver.id)} className='px-3 py-1 rounded-md text-xs bg-indigo-500 hover:bg-indigo-600 text-white'>Roll back to this version</button>
                                )}
                                <Link target='_blank' to={`/preview/${project.id}/${ver.id}`}>
                                <EyeIcon className='size-6 p-1 bg-gray-700 hover:bg-indigo-500 transition-colors rounded'/>
                                </Link>
                            </div>
                        </div>
                    )
                }
            })}
            {isGenerating && (
                <div className='flex items-start gap-3 justify-start'>
                    <div className='w-8 h-8 rounded-full bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center'>
                        <BotIcon className='size-5 text-white'/>
                    </div>
                    {/* three dot loader */}
                    <div className='flex gap-1.5 h-full items-end'>
                        <span className='size-2 rounded-full animate-bounce bg-gray-600' style={{animationDelay : '0s'}}/>
                        <span className='size-2 rounded-full animate-bounce bg-gray-600' style={{animationDelay : '0.2s'}}/>
                        <span className='size-2 rounded-full animate-bounce bg-gray-600' style={{animationDelay : '0.4s'}}/>
                    </div>
                </div>
            )

            }
            <div ref={messageRef}/>
        </div>
        {/* Input area */}
        <form onSubmit={handleRevisions} className='m-3 relative flex flex-col gap-2'>
            {attachments.length > 0 && (
                <div className="flex gap-2 px-1 overflow-x-auto no-scrollbar">
                    {attachments.map((url, i) => (
                        <div key={url} className="relative w-16 h-16 shrink-0 group">
                            <img src={url} alt="upload" className="w-full h-full object-cover rounded-md border border-gray-700" />
                            <button type="button" onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 bg-gray-900 rounded-full p-0.5 border border-gray-700 hover:text-red-400">
                                <XIcon size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className='flex items-center gap-2'>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isGenerating || isUploading} className='absolute bottom-2.5 left-2 rounded-full hover:bg-gray-700 p-1.5 transition-colors disabled:opacity-60 text-gray-400'>
                    {isUploading ? <Loader2Icon size={20} className="animate-spin"/> : <PaperclipIcon size={20} />}
                </button>
                <textarea onChange={(e)=>setInput(e.target.value)} value={input} rows={4} placeholder='Describe your website or request changes...' className='flex-1 py-3 pl-10 pr-12 rounded-xl resize-none text-sm outline-none ring ring-gray-700 focus:ring-indigo-500 bg-gray-800 text-gray-100 placeholder-gray-400 transition-all' disabled={isGenerating}/>
                <button disabled={isGenerating || (!input.trim() && attachments.length === 0)} className='absolute bottom-2.5 right-2.5 rounded-full bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white transition-colors disabled:opacity-60'>
                    {isGenerating 
                    ? <Loader2Icon className='size-7 p-1.5 animate-spin text-white'/>
                : <SendIcon className='size-7 p-1.5 text-white'/>}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}

export default Sidebar
