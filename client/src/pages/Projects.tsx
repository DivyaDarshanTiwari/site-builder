import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../types'
import { ArrowBigDownDashIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, FullscreenIcon, LaptopIcon, Loader2Icon, MessageSquareIcon, PaletteIcon, SaveIcon, SmartphoneIcon, TabletIcon, XIcon } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ProjectPreview, { type ProjectPreviewRef } from '../components/ProjectPreview'
import api from '@/configs/axios'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { getErrorMessage } from '@/lib/error'

const Projects = () => {
  const {projectId} = useParams()
  const navigate = useNavigate()
  const {data: session, isPending} = authClient.useSession()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [isGenerating, setIsGenerating] = useState(true)
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>("desktop")

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [isApplyingTheme, setIsApplyingTheme] = useState(false)

  const themes = ['Cyberpunk', 'Minimalist', 'Corporate', 'Dark Mode', 'Retro', 'Glassmorphism', 'Nature', 'Neon']

  const previewRef = useRef<ProjectPreviewRef>(null)

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/user/project/${projectId}`);
      setProject(data.project)
      setIsGenerating(!data.project.current_code)
      setLoading(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      console.log(error);
    }
  }, [projectId])

  const saveProject = async () => {
    if(!previewRef.current) return;
    const code = previewRef.current.getCode();
    if(!code) return;
    setIsSaving(true);
    try {
      const { data } = await api.put(`/api/project/save/${projectId}`, {code});
      toast.success(data.message)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      console.log(error);
    }finally{
      setIsSaving(false);
    }
    };

    // download code ( index.html )
  const downloadCode = ()=>{
    const code = previewRef.current?.getCode() || project?.current_code;
    if(!code) {
      return
    }
    const element = document.createElement('a');
    const file = new Blob([code], {type: "text/html"});
    element.href = URL.createObjectURL(file)
    element.download = "index.html";
    document.body.appendChild(element)
    element.click();
  }


  const togglePublish = async () => {
    try {
      const { data } = await api.get(`/api/user/publish-toggle/${projectId}`);
      toast.success(data.message)
      setProject((prev)=> prev ? ({...prev, isPublished: !prev.isPublished}) : null)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      console.log(error);
    }
  }

  const handleApplyTheme = async (theme: string) => {
    setIsThemeOpen(false)
    setIsApplyingTheme(true)
    try {
      const { data } = await api.post(`/api/project/theme/${projectId}`, { theme });
      toast.success(data.message)
      await fetchProject()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      console.log(error);
    } finally {
      setIsApplyingTheme(false)
    }
  }

  useEffect(()=>{
    if (isPending) {
      return;
    }

    if (session?.user) {
      fetchProject();
      return;
    }

    navigate("/")
    toast("Please login to view your projects")
  },[session?.user, isPending, navigate, fetchProject])

  useEffect(()=>{
    if(project && !project.current_code){
      const intervalId = setInterval(fetchProject, 10000);
      return ()=> clearInterval(intervalId)
    }
  },[project, fetchProject])

  if(loading){
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="size-7 animate-spin text-violet-200"/>
      </div>
    )
  }

  if(!project) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <p className="text-2xl font-medium text-gray-200">Unable to load project!</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-screen w-full bg-gray-900 text-white'>
      {/* builder navbar  */}
      <div className='flex max-sm:flex-col sm:items-center gap-4 px-4 py-2 no-scrollbar'>
        {/* left  */}
        <div className='flex items-center gap-2 sm:min-w-90 text-nowrap'>
          <button type="button" onClick={()=> navigate('/')} className="cursor-pointer">
            <img src="/favicon.svg" alt="logo" className="h-6"/>
          </button>
          <div className='max-w-64 sm:max-w-xs'>
            <p className='text-sm text-medium capitalize truncate'>{project.name}</p>
            <p className='text-xs text-gray-400 -mt-0.5'>Previewing last saved version</p>
          </div>
          <div className='sm:hidden flex-1 flex justify-end'>
            {isMenuOpen ? 
            <MessageSquareIcon onClick={()=> setIsMenuOpen(false)} className="size-6 cursor-pointer" />
            : <XIcon onClick={()=> setIsMenuOpen(true)} className="size-6 cursor-pointer"/>}
          </div>
        </div>
        {/* middle  */}
        <div className='hidden sm:flex gap-2 bg-gray-950 p-1.5 rounded-md'>
          <SmartphoneIcon onClick={()=> setDevice('phone')} className={`size-6 p-1 rounded cursor-pointer ${device === 'phone' ? "bg-gray-700" : ""}`}/>

          <TabletIcon onClick={()=> setDevice('tablet')} className={`size-6 p-1 rounded cursor-pointer ${device === 'tablet' ? "bg-gray-700" : ""}`}/>

          <LaptopIcon onClick={()=> setDevice('desktop')} className={`size-6 p-1 rounded cursor-pointer ${device === 'desktop' ? "bg-gray-700" : ""}`}/>
        </div>
        {/* right  */}
        <div className='flex items-center justify-end gap-3 flex-1 text-xs sm:text-sm'>
              {/* Theme Shifter */}
              <div className='relative'>
                <button
                  onClick={() => setIsThemeOpen(!isThemeOpen)}
                  disabled={isApplyingTheme || isGenerating}
                  className='max-sm:hidden bg-gray-800 hover:bg-gray-700 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors border border-gray-700'>
                  {isApplyingTheme ? <Loader2Icon className="animate-spin" size={16}/> : <PaletteIcon size={16}/>}
                  Theme <ChevronDownIcon size={14}/>
                </button>
                {isThemeOpen && (
                  <div className='absolute top-full mt-1 right-0 bg-gray-800 border border-gray-700 rounded-md shadow-xl z-50 min-w-40 py-1'>
                    {themes.map((theme) => (
                      <button
                        key={theme}
                        onClick={() => handleApplyTheme(theme)}
                        className='w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors'>
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={saveProject} disabled={isSaving} className='max-sm:hidden bg-gray-800 hover:bg-gray-700 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors border border-gray-700'>
                {isSaving ? <Loader2Icon className="animate-spin" size={16}/> : <SaveIcon size={16}/>} Save
              </button>
              <Link target='_blank' to={`/preview/${projectId}`} className="flex items-center gap-2 px-4 py-1 rounded sm:rounded-sm border border-gray-700 hover:border-gray-500 transition-colors">
                <FullscreenIcon size={16} /> Preview
              </Link>
              <button onClick={downloadCode} className='bg-linear-to-br from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors'>
                <ArrowBigDownDashIcon size={16} /> Download
              </button>
              <button onClick={togglePublish} className='bg-linear-to-br from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white px-3.5 py-1 flex items-center gap-2 rounded sm:rounded-sm transition-colors'>
                {project.isPublished ?
                <EyeOffIcon size={16}/> : <EyeIcon size={16}/> 
              }
                {project.isPublished ? "Unpublish" : "Publish"}
              </button>
        </div>
      </div>
      <div className='flex-1 flex overflow-auto'>
             <Sidebar isMenuOpen={isMenuOpen} project={project} setProject={(p)=>setProject(p)} isGenerating={isGenerating} setIsGenerating={setIsGenerating}/>

              <div className='flex-1 p-2 pl-0'>
                <ProjectPreview ref={previewRef} project={project} isGenerating={isGenerating} device={device}/>
              </div>
      </div>
    </div>
  )
}

export default Projects
