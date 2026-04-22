# Emotion-ML-Service: Комиссияға Қысқа Дәлел-Шпаргалка (KZ)

## 10–15 секундтық жауап (ең қысқа)
Мен FER2013 стиліндегі дайын датасетті қолдандым, бірақ жай қоймадым: осы репода CNN моделін оқытатын training пайплайн бар (`train_model.py`), инференс + preprocessing модулі бар (`inference/emotion_model.py`), және online тұрақтылық үшін temporal buffer арқылы risk/state есептедім (`backend/model_logic.py`). Осының бәрін FastAPI арқылы `/analyze` API қылып, жүйеге қосып шығардым. Видео сақталмайды, тек метрика/summary беріледі.

## 40–60 секундтық жауап (толық, бірақ қысқа)
Мен эмоцияларды тану моделін нөлден жүйе ретінде құрастырдым: датасетті FER2013 стилінде алып, оны train/test құрылымына келтірдім (7 класс: angry/disgust/fear/happy/neutral/sad/surprise). Содан кейін `training/train_model.py` арқылы CNN-ді оқытатын пайплайн жасалды: augmentation, EarlyStopping және ModelCheckpoint қолданылады, ең жақсы weights `emotion_model_custom.h5` болып сақталады. Инференсте `inference/emotion_model.py` кадрды preprocess жасайды (grayscale, 64x64, нормализация, optional CLAHE) және эмоция+confidence шығарады. Online видеода бір кадр қате болуы мүмкін болғандықтан temporal buffer қолдандым: соңғы кадрлардан decay арқылы risk есептеп, state (NORMAL/SUSPICIOUS/POTENTIAL THREAT) беремін (`backend/model_logic.py`). Соңында мұның бәрін FastAPI (`backend/app.py`) арқылы `/analyze` эндпоинтіне шығарып, сайтқа интеграцияладық. Видео сақталмайды.

## Нақты дәлелдер (кодпен ашып көрсететін жерлер)
Датасет құрылымы:
- `C:\Users\nurba\elas\emotion-ml-service\training\data\train\` (28 709 сурет)
- `C:\Users\nurba\elas\emotion-ml-service\training\data\test\` (7 178 сурет)
- Кластар: `angry`, `disgust`, `fear`, `happy`, `neutral`, `sad`, `surprise`

Оқыту қай жерде:
- `C:\Users\nurba\elas\emotion-ml-service\training\train_model.py`
- Дәлел жолдары: `flow_from_directory(...)`, `ImageDataGenerator(...)`, `model.fit(...)`, `ModelCheckpoint(filepath="../emotion_model_custom.h5")`

Оқытылған weights қай жерде:
- `C:\Users\nurba\elas\emotion-ml-service\emotion_model_custom.h5` (best checkpoint)
- `C:\Users\nurba\elas\emotion-ml-service\emotion_model.h5` (baseline/резерв)

Инференс (preprocess + predict) қай жерде:
- `C:\Users\nurba\elas\emotion-ml-service\inference\emotion_model.py`

Temporal buffer + risk/state қай жерде:
- `C:\Users\nurba\elas\emotion-ml-service\backend\model_logic.py`

API (production) қай жерде:
- `C:\Users\nurba\elas\emotion-ml-service\backend\app.py`
- Эндпоинт: `POST /analyze` (input: 64x64 grayscale array)

Маңызды ескерту (шатастырмау үшін):
- `C:\Users\nurba\elas\emotion-ml-service\app.py` тек қарапайым health болуы мүмкін.
- Негізгі API: `C:\Users\nurba\elas\emotion-ml-service\backend\app.py`.

## Комиссия жиі қоятын сұрақтар (дайын жауап)
Сұрақ: "Дайын модель алдым ба, әлде өзім жасадым ба?"
- Жауап: Датасет ашық (FER2013 стилі), ал модельді қолдануға жарайтын жүйені мен жасадым: training пайплайн (`train_model.py`), inference+preprocess (`inference/emotion_model.py`), temporal buffer арқылы тұрақтандыру (`backend/model_logic.py`), және FastAPI арқылы `/analyze` API (`backend/app.py`). Яғни модельді қайта оқытып, жаңартуға толық мүмкіндік бар.

Сұрақ: "FER2013 қайдан және неге?"
- Жауап: Эмоцияға label қою өте қымбат, сондықтан зерттеуде ашық стандарт датасеттер қолданылады. FER2013 форматымен ұқсас құрылым бізде train/test папкаларымен және 7 класс бойынша берілген.

Сұрақ: "Неге 64x64?"
- Жауап: Real-time үшін. Үлкен кадр ауыр болады. 64x64 inference-ті тездетеді және жүйе тұрақты жұмыс істейді.

Сұрақ: "Неге CNN?"
- Жауап: Бұл image classification. CNN бет мимикасындағы spatial feature-терді жақсы үйренеді.

Сұрақ: "Бір кадрға неге сенбейсіз?"
- Жауап: Жарық, blur, бас бұрылуы әсер етеді. Temporal buffer нәтижені тұрақтандырады (тәуекел және күйді уақыт бойынша есептейміз).

Сұрақ: "Видео сақтайсыз ба?"
- Жауап: Жоқ. Видео сақталмайды. Тек метрикалар және қорытынды summary қолданылады.

## Қысқа “көрсететін” команда (оқыту бар екенін дәлелдеу үшін)
```powershell
cd C:\Users\nurba\elas\emotion-ml-service\training
python train_model.py
```

