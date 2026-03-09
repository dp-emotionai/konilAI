# Запуск ML-сервиса (emotion-ml-service)

Если при запуске появляется ошибка вида:
`Unable to create process using '"C:\...\Documents\emotion-ml-service\venv\Scripts\python.exe"'`
— значит venv был создан в другой папке. Пересоздайте окружение командами ниже.

## Пересоздание venv (Windows PowerShell)

Используйте **`py`** (лаунчер Python в Windows), а не `python`, и для активации в PowerShell — **`Activate.ps1`**:

```powershell
cd C:\Users\nurba\elas\emotion-ml-service

# Выйти из текущего venv, если активен
deactivate

# Удалить старый venv (если есть)
Remove-Item -Recurse -Force .\venv -ErrorAction SilentlyContinue

# Создать venv (py — лаунчер Python в Windows)
py -m venv venv

# Активировать (в PowerShell — именно Activate.ps1 с большой буквы)
.\venv\Scripts\Activate.ps1

# Если появится ошибка про политику выполнения скриптов, один раз выполните:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Установить зависимости
pip install -r requirements.txt

# Запуск
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

## Активация уже созданного venv

Если папка `venv` уже есть (например, вы только что создали её через `py -m venv venv`):

```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

## Если PowerShell не даёт запустить Activate.ps1

Ошибка вида «не удаётся загрузить файл, так как выполнение скриптов отключено»:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

После этого снова выполните `.\venv\Scripts\Activate.ps1`.

## Остановка сервера (Ctrl+C)

При нажатии Ctrl+C в консоли появится сообщение с `KeyboardInterrupt` и `CancelledError` — это нормально, сервер корректно завершился.
