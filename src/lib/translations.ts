export type TranslationKey =
    | 'welcome'
    | 'recordingNotice'
    | 'startBtn'
    | 'joinBtn'
    | 'reqAccess'
    | 'allowAccess'
    | 'complete'
    | 'thankYou'
    | 'returnHome'
    | 'saving'
    | 'listening'
    | 'thinking'
    | 'speaking'
    | 'skip'
    | 'submit'
    | 'optionsHint';

export const TRANSLATIONS: Record<string, Record<TranslationKey, string>> = {
    'en-US': {
        welcome: 'Welcome to the study',
        recordingNotice: 'This interview will be recorded for research purposes.',
        startBtn: "Let's get started",
        joinBtn: 'Join Interview',
        reqAccess: 'Requesting camera and microphone access...',
        allowAccess: 'Please allow camera and microphone access to continue.',
        complete: 'Interview complete',
        thankYou: 'Thank you for your time!',
        returnHome: 'Return to Homepage',
        saving: 'Saving interview recording...',
        listening: 'Listening...',
        thinking: 'Thinking...',
        speaking: 'Speaking...',
        skip: 'Skip',
        submit: 'Submit',
        optionsHint: 'Select an option'
    },
    'es-ES': {
        welcome: 'Bienvenido al estudio',
        recordingNotice: 'Esta entrevista será grabada con fines de investigación.',
        startBtn: 'Empecemos',
        joinBtn: 'Unirse a la entrevista',
        reqAccess: 'Solicitando acceso a cámara y micrófono...',
        allowAccess: 'Por favor, permita el acceso a la cámara y micrófono para continuar.',
        complete: 'Entrevista completada',
        thankYou: '¡Gracias por su tiempo!',
        returnHome: 'Volver a la página principal',
        saving: 'Guardando grabación de la entrevista...',
        listening: 'Escuchando...',
        thinking: 'Pensando...',
        speaking: 'Hablando...',
        skip: 'Saltar',
        submit: 'Enviar',
        optionsHint: 'Seleccione una opción'
    },
    'fr-FR': {
        welcome: 'Bienvenue dans l\'étude',
        recordingNotice: 'Cette entrevue sera enregistrée à des fins de recherche.',
        startBtn: 'Commençons',
        joinBtn: 'Rejoindre l\'entrevue',
        reqAccess: 'Demande d\'accès à la caméra et au microphone...',
        allowAccess: 'Veuillez autoriser l\'accès à la caméra et au microphone pour continuer.',
        complete: 'Entrevue terminée',
        thankYou: 'Merci pour votre temps !',
        returnHome: 'Retour à l\'accueil',
        saving: 'Enregistrement de l\'entrevue en cours...',
        listening: 'Écoute...',
        thinking: 'Réflexion...',
        speaking: 'Parle...',
        skip: 'Passer',
        submit: 'Soumettre',
        optionsHint: 'Sélectionnez une option'
    },
    'de-DE': {
        welcome: 'Willkommen zur Studie',
        recordingNotice: 'Dieses Interview wird zu Forschungszwecken aufgezeichnet.',
        startBtn: 'Lass uns anfangen',
        joinBtn: 'Am Interview teilnehmen',
        reqAccess: 'Zugriff auf Kamera und Mikrofon wird angefordert...',
        allowAccess: 'Bitte erlauben Sie den Zugriff auf Kamera und Mikrofon.',
        complete: 'Interview abgeschlossen',
        thankYou: 'Vielen Dank für Ihre Zeit!',
        returnHome: 'Zurück zur Startseite',
        saving: 'Interview-Aufzeichnung wird gespeichert...',
        listening: 'Zuhören...',
        thinking: 'Nachdenken...',
        speaking: 'Sprechen...',
        skip: 'Überspringen',
        submit: 'Einreichen',
        optionsHint: 'Wählen Sie eine Option'
    },
    'it-IT': {
        welcome: 'Benvenuti allo studio',
        recordingNotice: 'Questa intervista sarà registrata per scopi di ricerca.',
        startBtn: 'Iniziamo',
        joinBtn: 'Partecipa all\'intervista',
        reqAccess: 'Richiesta di accesso alla fotocamera e al microfono...',
        allowAccess: 'Consenti l\'accesso alla fotocamera e al microfono per continuare.',
        complete: 'Intervista completata',
        thankYou: 'Grazie per il tuo tempo!',
        returnHome: 'Torna alla Home',
        saving: 'Salvataggio registrazione in corso...',
        listening: 'In ascolto...',
        thinking: 'Elaborazione...',
        speaking: 'Parlando...',
        skip: 'Salta',
        submit: 'Invia',
        optionsHint: 'Seleziona un\'opzione'
    },
    'ja-JP': {
        welcome: '調査へようこそ',
        recordingNotice: 'このインタビューは調査目的で録画されます。',
        startBtn: '始めましょう',
        joinBtn: 'インタビューに参加',
        reqAccess: 'カメラとマイクへのアクセスを要求しています...',
        allowAccess: '続行するにはカメラとマイクへのアクセスを許可してください。',
        complete: 'インタビュー完了',
        thankYou: 'お時間をいただきありがとうございました！',
        returnHome: 'ホームページに戻る',
        saving: 'インタビュー録画を保存しています...',
        listening: '聞き取り中...',
        thinking: '考え中...',
        speaking: '発話中...',
        skip: 'スキップ',
        submit: '送信',
        optionsHint: 'オプションを選択してください'
    },
    'ko-KR': {
        welcome: '연구에 오신 것을 환영합니다',
        recordingNotice: '이 인터뷰는 연구 목적으로 녹화됩니다.',
        startBtn: '시작하기',
        joinBtn: '인터뷰 참여',
        reqAccess: '카메라 및 마이크 액세스 요청 중...',
        allowAccess: '계속하려면 카메라 및 마이크 액세스를 허용해주세요.',
        complete: '인터뷰 완료',
        thankYou: '시간을 내주셔서 감사합니다!',
        returnHome: '홈페이지로 돌아가기',
        saving: '인터뷰 녹화 저장 중...',
        listening: '듣는 중...',
        thinking: '생각 중...',
        speaking: '말하는 중...',
        skip: '건너뛰기',
        submit: '제출',
        optionsHint: '옵션 선택'
    },
    'pt-BR': {
        welcome: 'Bem-vindo ao estudo',
        recordingNotice: 'Esta entrevista será gravada para fins de pesquisa.',
        startBtn: 'Vamos começar',
        joinBtn: 'Entrar na Entrevista',
        reqAccess: 'Solicitando acesso à câmera e microfone...',
        allowAccess: 'Por favor, permita o acesso à câmera e microfone para continuar.',
        complete: 'Entrevista concluída',
        thankYou: 'Obrigado pelo seu tempo!',
        returnHome: 'Voltar à página inicial',
        saving: 'Salvando gravação da entrevista...',
        listening: 'Ouvindo...',
        thinking: 'Pensando...',
        speaking: 'Falando...',
        skip: 'Pular',
        submit: 'Enviar',
        optionsHint: 'Selecione uma opção'
    },
    'zh-CN': {
        welcome: '欢迎参加研究',
        recordingNotice: '本次访谈将出于研究目的进行录像。',
        startBtn: '我们开始吧',
        joinBtn: '加入访谈',
        reqAccess: '正在请求使用摄像头和麦克风...',
        allowAccess: '请允许使用摄像头和麦克风以继续。',
        complete: '访谈完成',
        thankYou: '感谢您的时间！',
        returnHome: '返回主页',
        saving: '正在保存访谈录像...',
        listening: '正在聆听...',
        thinking: '正在思考...',
        speaking: '正在说话...',
        skip: '跳过',
        submit: '提交',
        optionsHint: '选择一个选项'
    },
    'hi-IN': {
        welcome: 'अध्ययन में आपका स्वागत है',
        recordingNotice: 'यह साक्षात्कार अनुसंधान के उद्देश्य से रिकॉर्ड किया जाएगा।',
        startBtn: 'चलो शुरू करते हैं',
        joinBtn: 'साक्षात्कार में शामिल हों',
        reqAccess: 'कैमरा और माइक्रोफ़ोन एक्सेस का अनुरोध कर रहा है...',
        allowAccess: 'कृपया जारी रखने के लिए कैमरा और माइक्रोफ़ोन एक्सेस की अनुमति दें।',
        complete: 'साक्षात्कार पूरा हुआ',
        thankYou: 'आपके समय के लिए धन्यवाद!',
        returnHome: 'होमपेज पर वापस जाएँ',
        saving: 'साक्षात्कार रिकॉर्डिंग सहेजी जा रही है...',
        listening: 'सुन रहा है...',
        thinking: 'सोच रहा है...',
        speaking: 'बोल रहा है...',
        skip: 'छोड़ें',
        submit: 'जमा करें',
        optionsHint: 'एक विकल्प चुनें'
    },
    'ru-RU': {
        welcome: 'Добро пожаловать в исследование',
        recordingNotice: 'Это интервью будет записано в исследовательских целях.',
        startBtn: 'Давайте начнем',
        joinBtn: 'Присоединиться к интервью',
        reqAccess: 'Запрос доступа к камере и микрофону...',
        allowAccess: 'Пожалуйста, разрешите доступ к камере и микрофону для продолжения.',
        complete: 'Интервью завершено',
        thankYou: 'Спасибо за ваше время!',
        returnHome: 'Вернуться на главную',
        saving: 'Сохранение записи интервью...',
        listening: 'Слушаю...',
        thinking: 'Думаю...',
        speaking: 'Говорю...',
        skip: 'Пропустить',
        submit: 'Отправить',
        optionsHint: 'Выберите опцию'
    }
};

export function getTranslation(lang: string, key: TranslationKey): string {
    const translations = TRANSLATIONS[lang] || TRANSLATIONS['en-US'];
    return translations[key] || TRANSLATIONS['en-US'][key];
}
