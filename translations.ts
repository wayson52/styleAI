
export type LanguageCode = 'en' | 'zh-CN' | 'ms' | 'ko' | 'ja';

export interface TranslationSchema {
  // Header
  appName: string;
  
  // Modes
  modeHuman: string;
  modePet: string;

  // Columns
  colModel: string;
  colTops: string;
  colBottoms: string;
  colPetOutfit: string;

  // Actions
  btnGenerate: string;
  btnGenerating: string;
  btnDownload: string;
  btnNext: string;

  // States
  statusReady: string;
  statusReadyDesc: string;
  statusProcessing: string;
  statusPreparing: string;
  statusAnalyzing: string;
  statusDesigning: string;
  statusFinalizing: string;

  // History
  historyTitle: string;
  historyClear: string;

  // Errors
  errSelectModel: string;
  errSelectClothes: string;
  errSelectOutfit: string;
  errFailed: string;
  errTraffic: string;

  // Upload Section Labels (passed to child component)
  uploadLabels: {
    titleModel: string;
    descModel: string;
    titlePet: string;
    descPet: string;
    titleTops: string;
    titleBottoms: string;
    titlePetOutfit: string;
    descPetOutfit: string;
    
    btnUpload: string;
    btnCamera: string;
    btnPaste: string;
    placeholderUrl: string;
    placeholderSearch: string;
    
    cameraClose: string;
    cameraCapture: string;
    cameraSwitch: string;
    cameraInstructionModel: string;
    cameraInstructionItem: string;
    
    selectSamples: string;
    hideSamples: string;
    searching: string;
    loading: string;
    noSamples: string;
    showMore: string;
    showLess: string;
    
    filterAll: string;
    filterMale: string;
    filterFemale: string;
    
    shuffle: string;
    selected: string;
  }
}

export const translations: Record<LanguageCode, TranslationSchema> = {
  en: {
    appName: "StyleAI",
    modeHuman: "Human",
    modePet: "Pet",
    colModel: "Base Model",
    colTops: "Tops",
    colBottoms: "Bottoms",
    colPetOutfit: "Pet Outfit",
    btnGenerate: "Generate Try-On",
    btnGenerating: "Processing...",
    btnDownload: "Download",
    btnNext: "Next",
    statusReady: "Ready to Create",
    statusReadyDesc: "Select a model and clothes, then hit Generate.",
    statusProcessing: "Processing...",
    statusPreparing: "Preparing images...",
    statusAnalyzing: "Analyzing inputs...",
    statusDesigning: "Designing outfit...",
    statusFinalizing: "Finalizing...",
    historyTitle: "History",
    historyClear: "Clear Recent",
    errSelectModel: "Please select a model first.",
    errSelectClothes: "Select clothes first.",
    errSelectOutfit: "Select an outfit.",
    errFailed: "Failed to generate image.",
    errTraffic: "High traffic. Try again later.",
    uploadLabels: {
      titleModel: "Select Model",
      descModel: "Upload a photo or paste a link.",
      titlePet: "Select Pet",
      descPet: "Upload a photo of your pet.",
      titleTops: "",
      titleBottoms: "",
      titlePetOutfit: "Choose Outfit",
      descPetOutfit: "Select a cute outfit for your pet.",
      btnUpload: "Upload",
      btnCamera: "Camera",
      btnPaste: "Paste image (Ctrl+V)",
      placeholderUrl: "Paste image (Ctrl+V) or URL...",
      placeholderSearch: "Paste image or Search...",
      cameraClose: "Close",
      cameraCapture: "Capture",
      cameraSwitch: "Switch",
      cameraInstructionModel: "Take a photo of the model",
      cameraInstructionItem: "Take a photo of the item",
      selectSamples: "Select from Samples",
      hideSamples: "Hide Samples",
      searching: "Searching...",
      loading: "Loading...",
      noSamples: "No samples match filters.",
      showMore: "more",
      showLess: "Show Less",
      filterAll: "All",
      filterMale: "Male",
      filterFemale: "Female",
      shuffle: "Shuffle",
      selected: "Selected"
    }
  },
  'zh-CN': {
    appName: "StyleAI",
    modeHuman: "人物",
    modePet: "宠物",
    colModel: "基础模特",
    colTops: "上装",
    colBottoms: "下装",
    colPetOutfit: "宠物服装",
    btnGenerate: "生成试穿效果",
    btnGenerating: "生成中...",
    btnDownload: "下载",
    btnNext: "下一步",
    statusReady: "准备生成",
    statusReadyDesc: "选择模特和服装，然后点击生成。",
    statusProcessing: "处理中...",
    statusPreparing: "准备图片...",
    statusAnalyzing: "分析图像...",
    statusDesigning: "设计服装...",
    statusFinalizing: "完成中...",
    historyTitle: "历史记录",
    historyClear: "清除最近",
    errSelectModel: "请先选择模特。",
    errSelectClothes: "请先选择服装。",
    errSelectOutfit: "请选择一套服装。",
    errFailed: "生成图片失败。",
    errTraffic: "访问量过高，请稍后再试。",
    uploadLabels: {
      titleModel: "选择模特",
      descModel: "上传照片或粘贴链接。",
      titlePet: "选择宠物",
      descPet: "上传您的宠物照片。",
      titleTops: "",
      titleBottoms: "",
      titlePetOutfit: "选择服装",
      descPetOutfit: "为您的宠物挑选可爱的服装。",
      btnUpload: "上传图片",
      btnCamera: "相机拍摄",
      btnPaste: "粘贴图片 (Ctrl+V)",
      placeholderUrl: "粘贴图片 (Ctrl+V) 或链接...",
      placeholderSearch: "粘贴图片或搜索...",
      cameraClose: "关闭",
      cameraCapture: "拍照",
      cameraSwitch: "切换",
      cameraInstructionModel: "拍摄模特照片",
      cameraInstructionItem: "拍摄物品照片",
      selectSamples: "从示例中选择",
      hideSamples: "隐藏示例",
      searching: "搜索中...",
      loading: "加载中...",
      noSamples: "没有匹配的示例。",
      showMore: "更多",
      showLess: "收起",
      filterAll: "全部",
      filterMale: "男款",
      filterFemale: "女款",
      shuffle: "随机推荐",
      selected: "已选择"
    }
  },
  ms: {
    appName: "StyleAI",
    modeHuman: "Manusia",
    modePet: "Haiwan",
    colModel: "Model Asas",
    colTops: "Baju",
    colBottoms: "Seluar/Kain",
    colPetOutfit: "Baju Haiwan",
    btnGenerate: "Hasilkan Cubaan",
    btnGenerating: "Sedang Proses...",
    btnDownload: "Muat Turun",
    btnNext: "Seterusnya",
    statusReady: "Sedia Mencipta",
    statusReadyDesc: "Pilih model dan pakaian, kemudian tekan Hasilkan.",
    statusProcessing: "Memproses...",
    statusPreparing: "Menyediakan imej...",
    statusAnalyzing: "Menganalisis input...",
    statusDesigning: "Mereka bentuk...",
    statusFinalizing: "Menyiapkan...",
    historyTitle: "Sejarah",
    historyClear: "Padam Terkini",
    errSelectModel: "Sila pilih model dahulu.",
    errSelectClothes: "Pilih pakaian dahulu.",
    errSelectOutfit: "Pilih satu pakaian.",
    errFailed: "Gagal menghasilkan imej.",
    errTraffic: "Trafik tinggi. Cuba sebentar lagi.",
    uploadLabels: {
      titleModel: "Pilih Model",
      descModel: "Muat naik foto atau tampal pautan.",
      titlePet: "Pilih Haiwan",
      descPet: "Muat naik foto haiwan anda.",
      titleTops: "",
      titleBottoms: "",
      titlePetOutfit: "Pilih Pakaian",
      descPetOutfit: "Pilih pakaian comel untuk haiwan anda.",
      btnUpload: "Muat Naik",
      btnCamera: "Kamera",
      btnPaste: "Tampal (Ctrl+V)",
      placeholderUrl: "Tampal imej (Ctrl+V) atau URL...",
      placeholderSearch: "Tampal imej atau Cari...",
      cameraClose: "Tutup",
      cameraCapture: "Tangkap",
      cameraSwitch: "Tukar",
      cameraInstructionModel: "Ambil gambar model",
      cameraInstructionItem: "Ambil gambar barang",
      selectSamples: "Pilih dari Contoh",
      hideSamples: "Sembunyi Contoh",
      searching: "Mencari...",
      loading: "Memuatkan...",
      noSamples: "Tiada contoh sepadan.",
      showMore: "lagi",
      showLess: "Kurangkan",
      filterAll: "Semua",
      filterMale: "Lelaki",
      filterFemale: "Wanita",
      shuffle: "Rawak",
      selected: "Dipilih"
    }
  },
  ko: {
    appName: "StyleAI",
    modeHuman: "사람",
    modePet: "반려동물",
    colModel: "기본 모델",
    colTops: "상의",
    colBottoms: "하의",
    colPetOutfit: "반려동물 옷",
    btnGenerate: "가상 피팅 생성",
    btnGenerating: "처리 중...",
    btnDownload: "다운로드",
    btnNext: "다음",
    statusReady: "준비 완료",
    statusReadyDesc: "모델과 옷을 선택한 후 생성을 누르세요.",
    statusProcessing: "처리 중...",
    statusPreparing: "이미지 준비 중...",
    statusAnalyzing: "입력 분석 중...",
    statusDesigning: "의상 디자인 중...",
    statusFinalizing: "마무리 중...",
    historyTitle: "히스토리",
    historyClear: "최근 기록 지우기",
    errSelectModel: "먼저 모델을 선택해주세요.",
    errSelectClothes: "옷을 선택해주세요.",
    errSelectOutfit: "의상을 선택해주세요.",
    errFailed: "이미지 생성 실패.",
    errTraffic: "트래픽이 많습니다. 잠시 후 다시 시도하세요.",
    uploadLabels: {
      titleModel: "모델 선택",
      descModel: "사진 업로드 또는 링크 붙여넣기.",
      titlePet: "반려동물 선택",
      descPet: "반려동물 사진을 업로드하세요.",
      titleTops: "",
      titleBottoms: "",
      titlePetOutfit: "의상 선택",
      descPetOutfit: "반려동물을 위한 귀여운 옷을 선택하세요.",
      btnUpload: "업로드",
      btnCamera: "카메라",
      btnPaste: "붙여넣기 (Ctrl+V)",
      placeholderUrl: "이미지(Ctrl+V) 또는 URL 붙여넣기...",
      placeholderSearch: "이미지 붙여넣기 또는 검색...",
      cameraClose: "닫기",
      cameraCapture: "촬영",
      cameraSwitch: "전환",
      cameraInstructionModel: "모델 사진 촬영",
      cameraInstructionItem: "아이템 사진 촬영",
      selectSamples: "샘플에서 선택",
      hideSamples: "샘플 숨기기",
      searching: "검색 중...",
      loading: "로딩 중...",
      noSamples: "일치하는 샘플이 없습니다.",
      showMore: "더 보기",
      showLess: "접기",
      filterAll: "전체",
      filterMale: "남성",
      filterFemale: "여성",
      shuffle: "셔플",
      selected: "선택됨"
    }
  },
  ja: {
    appName: "StyleAI",
    modeHuman: "人物",
    modePet: "ペット",
    colModel: "ベースモデル",
    colTops: "トップス",
    colBottoms: "ボトムス",
    colPetOutfit: "ペットの服",
    btnGenerate: "バーチャル試着を生成",
    btnGenerating: "処理中...",
    btnDownload: "ダウンロード",
    btnNext: "次へ",
    statusReady: "作成準備完了",
    statusReadyDesc: "モデルと服を選択して、生成ボタンを押してください。",
    statusProcessing: "処理中...",
    statusPreparing: "画像を準備中...",
    statusAnalyzing: "入力を分析中...",
    statusDesigning: "衣装をデザイン中...",
    statusFinalizing: "仕上げ中...",
    historyTitle: "履歴",
    historyClear: "履歴を消去",
    errSelectModel: "先にモデルを選択してください。",
    errSelectClothes: "服を選択してください。",
    errSelectOutfit: "衣装を選択してください。",
    errFailed: "画像の生成に失敗しました。",
    errTraffic: "アクセスが集中しています。後でもう一度お試しください。",
    uploadLabels: {
      titleModel: "モデルを選択",
      descModel: "写真をアップロードまたはリンクを貼り付け。",
      titlePet: "ペットを選択",
      descPet: "ペットの写真をアップロードしてください。",
      titleTops: "",
      titleBottoms: "",
      titlePetOutfit: "衣装を選択",
      descPetOutfit: "ペットにかわいい衣装を選んでください。",
      btnUpload: "アップロード",
      btnCamera: "カメラ",
      btnPaste: "貼り付け (Ctrl+V)",
      placeholderUrl: "画像(Ctrl+V)またはURL...",
      placeholderSearch: "画像貼り付け または検索...",
      cameraClose: "閉じる",
      cameraCapture: "撮影",
      cameraSwitch: "切り替え",
      cameraInstructionModel: "モデルを撮影",
      cameraInstructionItem: "アイテムを撮影",
      selectSamples: "サンプルから選択",
      hideSamples: "サンプルを隠す",
      searching: "検索中...",
      loading: "読み込み中...",
      noSamples: "一致するサンプルがありません。",
      showMore: "もっと見る",
      showLess: "表示を減らす",
      filterAll: "すべて",
      filterMale: "男性",
      filterFemale: "女性",
      shuffle: "シャッフル",
      selected: "選択中"
    }
  }
};
