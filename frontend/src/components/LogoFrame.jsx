const LogoFrame = ({ img, title }) => {
  return (
    <div className="flex items-center gap-3">
      <img src={img} alt={title + "logo"} className="h-10 w-10" />
      <span className="text-xl font-bold text-[#1E3A8A]">{title}</span>
    </div>
  );
};

export default LogoFrame;
