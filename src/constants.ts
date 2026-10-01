export const CHARACTER_STYLES = [
  { nameEn: "Realism", nameVi: "Ảnh thực (Realism)", descriptionEn: "Highly detailed, lifelike representation.", descriptionVi: "Hình ảnh chi tiết, chân thực như đời thực." },
  { nameEn: "Semi-Realism", nameVi: "Bán thực (Semi-Realism)", descriptionEn: "A blend of realistic and stylized elements.", descriptionVi: "Sự pha trộn giữa các yếu tố thực tế và cách điệu." },
  { nameEn: "3D Animation", nameVi: "Hoạt hình 3D", descriptionEn: "Modern 3D animated film style.", descriptionVi: "Phong cách phim hoạt hình 3D hiện đại." },
  { nameEn: "2D Animation", nameVi: "Hoạt hình 2D", descriptionEn: "Classic 2D hand-drawn animation style.", descriptionVi: "Phong cách hoạt hình 2D vẽ tay cổ điển." },
  { nameEn: "Pixel Art", nameVi: "Nghệ thuật điểm ảnh (Pixel Art)", descriptionEn: "Retro, nostalgic pixel-based art.", descriptionVi: "Nghệ thuật dựa trên điểm ảnh hoài cổ." },
  { nameEn: "Watercolor", nameVi: "Màu nước (Watercolor)", descriptionEn: "Soft, artistic watercolor painting style.", descriptionVi: "Phong cách tranh màu nước nghệ thuật, mềm mại." },
  { nameEn: "Oil Painting", nameVi: "Tranh sơn dầu (Oil Painting)", descriptionEn: "Classic, textured oil painting style.", descriptionVi: "Phong cách tranh sơn dầu cổ điển, có kết cấu." },
  { nameEn: "Cyberpunk", nameVi: "Phong cách Cyberpunk", descriptionEn: "Futuristic, high-tech, neon-lit style.", descriptionVi: "Phong cách tương lai, công nghệ cao, ánh sáng neon." },
  { nameEn: "Sketch/Line Art", nameVi: "Phác thảo/Nét vẽ (Sketch/Line Art)", descriptionEn: "Minimalist, expressive line-based art.", descriptionVi: "Nghệ thuật dựa trên nét vẽ tối giản, biểu cảm." },
  { nameEn: "Studio Ghibli Style", nameVi: "Phong cách Studio Ghibli", descriptionEn: "Whimsical, detailed, Ghibli-inspired art.", descriptionVi: "Phong cách nghệ thuật chi tiết, bay bổng lấy cảm hứng từ Ghibli." },
];

export const STYLE_CATEGORIES = [
  {
    id: 'animation',
    name: 'Hoạt hình',
    subcategories: [
      { id: 'felted-wool', name: 'Stop Motion Felt/Wool (Len nỉ)', tooltip: 'Phù hợp với phim hoạt hình thiếu nhi, cổ tích, dễ thương, mang tính thủ công.' },
      { id: 'style-2d', name: 'Style 2D', tooltip: 'Phù hợp với phim hoạt hình truyền thống, hài hước, hành động, hoặc phim ngắn kể chuyện.' },
      { id: 'anime-ghibli', name: 'Style Anime/Ghibli', tooltip: 'Phù hợp với phim giả tưởng, tình cảm, đời thường, mang đậm chất thơ và lãng mạn.' },
      { id: '3d-vietnam', name: 'Style 3D Việt Nam', tooltip: 'Phù hợp với phim hoạt hình mang yếu tố văn hóa, lịch sử, cổ tích Việt Nam.' },
      { id: '3d-pixar', name: 'Style 3D Pixar', tooltip: 'Phù hợp với phim hoạt hình gia đình, phiêu lưu, hài hước, chất lượng cao.' },
      { id: 'claymation', name: 'Style Claymation (Đất Sét)', tooltip: 'Phù hợp với phim hoạt hình hài hước, kỳ dị, độc đáo, mang tính nghệ thuật cao.' },
      { id: 'semi-realism', name: '3D Semi Realism', tooltip: 'Phù hợp với phim giả tưởng, hành động, game cinematic, kết hợp giữa thực tế và cách điệu.' },
    ]
  },
  {
    id: 'live-action',
    name: 'Phim người thật',
    subcategories: [
      { id: 'cinematic', name: 'Cinematic', tooltip: 'Phù hợp với phim điện ảnh, drama, hành động.' },
      { id: 'documentary', name: 'Documentary', tooltip: 'Phù hợp với phim tài liệu, phóng sự.' },
      { id: 'vintage', name: 'Vintage/Retro', tooltip: 'Phù hợp với phim bối cảnh xưa, hoài niệm.' },
      { id: 'cyberpunk', name: 'Cyberpunk', tooltip: 'Phù hợp với phim khoa học viễn tưởng tương lai.' },
    ]
  }
];
