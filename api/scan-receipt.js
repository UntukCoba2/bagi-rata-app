import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    
    // Inisialisasi Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Menggunakan model 1.5 Flash karena sangat cepat dan pintar untuk vision
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prompt cerdas untuk memaksa Gemini mengembalikan JSON murni
    const prompt = `Anda adalah asisten kasir cerdas. Analisis gambar struk/nota ini. 
    Ekstrak semua daftar pesanan/menu makanan atau minuman.
    Abaikan pajak (tax), service charge, diskon, dan total akhir. Fokus HANYA pada item menu.
    Terkadang tulisan struk disingkat (misal: "NS GRG" = Nasi Goreng). Tulis ulang menjadi nama yang wajar.
    
    Kembalikan HANYA dalam format JSON array of objects yang valid murni tanpa markdown, tanpa tanda \`\`\`json.
    Format persis seperti ini:
    [
      {"name": "Nasi Goreng Spesial", "qty": 2, "price": 50000},
      {"name": "Es Teh Manis", "qty": 1, "price": 8000}
    ]
    
    PENTING: 
    - Pastikan 'price' adalah HARGA TOTAL untuk baris item tersebut (bukan harga satuan), dalam bentuk angka (integer) tanpa titik/koma/Rp.
    - Pastikan 'qty' adalah angka integer.`;

    // Membersihkan header base64 dari frontend
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    // Kirim gambar dan prompt ke AI
    const result = await model.generateContent([prompt, imagePart]);
    let textResult = result.response.text();
    
    // Membersihkan sisa markdown jika Gemini bandel
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const items = JSON.parse(textResult);
    res.status(200).json({ items });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Gagal memproses struk' });
  }
}