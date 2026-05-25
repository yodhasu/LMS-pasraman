export default function Navbar() {
  return (
    <header className="h-16 bg-white border-b border-[#1F3D30]/5 flex items-center justify-between px-8 sticky top-0 z-20">
      <div>
        <h2 className="font-semibold text-[#1F3D30]">Om Swastyastu, Adi 🙏</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-sm px-3 py-1.5 rounded-lg border border-[#1F3D30]/10 text-[#5C7A6E] hover:bg-[#1F3D30]/5 transition-colors">🔔</button>
        <span className="text-xs text-[#C8A84E] font-semibold">Semester Genap 2025/2026</span>
      </div>
    </header>
  );
}
