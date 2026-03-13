import Footer from '../components/Footer';

const Pricing = () => {
    
  return (
    <>
      <div className='w-full max-w-5xl mx-auto z-20 max-md:px-4 min-h-[80vh]'>
        <div className='text-center mt-16'>
            <h2 className='text-gray-100 text-3xl font-medium'>Pricing</h2>
            <p className='text-gray-400 text-sm max-w-md mx-auto mt-2'>This app no longer uses payments or credits.</p>
        </div>
        <div className='pt-14 py-4 px-4'>
            <div className="p-6 bg-black/20 ring ring-indigo-950 mx-auto w-full max-w-xl rounded-lg text-white shadow-lg">
                <h3 className="text-xl font-bold">Free</h3>
                <p className="text-gray-300 mt-2">All project creation and revisions are available to logged-in users without any subscription or credit purchases.</p>
            </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Pricing
