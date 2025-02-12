'use client';
export default function Home() {
  return (
    <div className="h-screen w-full bg-gray-100 flex flex-row items-center justify-center gap-12">

      <div
        className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg cursor-pointer transition-transform hover:scale-105"
        onClick={() => (window.location.href = '/disclose')}
      >
        <h2 className="text-2xl text-black font-bold mb-4">Disclose</h2>
        <p className="text-gray-600">1 step disclosure flow</p>
      </div>
    </div>
  );
}
