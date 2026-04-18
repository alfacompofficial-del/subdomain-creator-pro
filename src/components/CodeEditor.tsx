import Editor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useRef } from "react";
import { getCodeCompletion, getCodeFix } from "@/lib/gemini";

interface CodeEditorProps {
  language: "html" | "css" | "javascript" | "python";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// ─── HTML Tag Snippets ────────────────────────────────────────────────────────
const HTML_SNIPPETS: Record<string, { body: string; description: string }> = {
  html: { body: `<html lang="ru">\n    \${0}\n</html>`, description: "<html> тег" },
  head: { body: `<head>\n    \${0}\n</head>`, description: "<head> тег" },
  body: { body: `<body>\n    \${0}\n</body>`, description: "<body> тег" },
  div: { body: `<div>\n    \${0}\n</div>`, description: "<div> блок" },
  span: { body: `<span>\${0}</span>`, description: "<span> строчный элемент" },
  p: { body: `<p>\${0}</p>`, description: "<p> параграф" },
  h1: { body: `<h1>\${0}</h1>`, description: "<h1> заголовок" },
  h2: { body: `<h2>\${0}</h2>`, description: "<h2> заголовок" },
  h3: { body: `<h3>\${0}</h3>`, description: "<h3> заголовок" },
  h4: { body: `<h4>\${0}</h4>`, description: "<h4> заголовок" },
  h5: { body: `<h5>\${0}</h5>`, description: "<h5> заголовок" },
  h6: { body: `<h6>\${0}</h6>`, description: "<h6> заголовок" },
  a: { body: `<a href="\${1:#}">\${0}</a>`, description: "<a> ссылка" },
  img: { body: `<img src="\${1:url}" alt="\${2:описание}">`, description: "<img> изображение" },
  ul: { body: `<ul>\n    <li>\${0}</li>\n</ul>`, description: "<ul> ненумерованный список" },
  ol: { body: `<ol>\n    <li>\${0}</li>\n</ol>`, description: "<ol> нумерованный список" },
  li: { body: `<li>\${0}</li>`, description: "<li> элемент списка" },
  table: { body: `<table>\n    <thead>\n        <tr>\n            <th>\${1}</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr>\n            <td>\${0}</td>\n        </tr>\n    </tbody>\n</table>`, description: "<table> таблица" },
  tr: { body: `<tr>\n    \${0}\n</tr>`, description: "<tr> строка таблицы" },
  td: { body: `<td>\${0}</td>`, description: "<td> ячейка таблицы" },
  th: { body: `<th>\${0}</th>`, description: "<th> заголовок таблицы" },
  form: { body: `<form action="\${1:#}" method="\${2:post}">\n    \${0}\n</form>`, description: "<form> форма" },
  input: { body: `<input type="\${1:text}" name="\${2:name}" placeholder="\${3:текст}">`, description: "<input> поле ввода" },
  button: { body: `<button type="\${1:button}">\${0}</button>`, description: "<button> кнопка" },
  textarea: { body: `<textarea name="\${1:name}" rows="\${2:4}" cols="\${3:40}">\${0}</textarea>`, description: "<textarea> многостроковый ввод" },
  select: { body: `<select name="\${1:name}">\n    <option value="\${2:value}">\${0}</option>\n</select>`, description: "<select> выпадающий список" },
  label: { body: `<label for="\${1:id}">\${0}</label>`, description: "<label> метка" },
  nav: { body: `<nav>\n    \${0}\n</nav>`, description: "<nav> навигация" },
  header: { body: `<header>\n    \${0}\n</header>`, description: "<header> шапка" },
  footer: { body: `<footer>\n    \${0}\n</footer>`, description: "<footer> подвал" },
  main: { body: `<main>\n    \${0}\n</main>`, description: "<main> основное содержимое" },
  section: { body: `<section>\n    \${0}\n</section>`, description: "<section> раздел" },
  article: { body: `<article>\n    \${0}\n</article>`, description: "<article> статья" },
  aside: { body: `<aside>\n    \${0}\n</aside>`, description: "<aside> боковая панель" },
  script: { body: `<script>\n    \${0}\n</script>`, description: "<script> JavaScript" },
  style: { body: `<style>\n    \${0}\n</style>`, description: "<style> CSS стили" },
  link: { body: `<link rel="stylesheet" href="\${1:style.css}">`, description: "<link> подключение файла" },
  meta: { body: `<meta name="\${1:description}" content="\${0}">`, description: "<meta> метаданные" },
  iframe: { body: `<iframe src="\${1:url}" width="\${2:600}" height="\${3:400}">\${0}</iframe>`, description: "<iframe> встроенный фрейм" },
  video: { body: `<video src="\${1:url}" controls>\n    \${0}\n</video>`, description: "<video> видео" },
  audio: { body: `<audio src="\${1:url}" controls>\n    \${0}\n</audio>`, description: "<audio> аудио" },
  canvas: { body: `<canvas id="\${1:canvas}" width="\${2:800}" height="\${3:600}">\${0}</canvas>`, description: "<canvas> холст" },
  br: { body: `<br>`, description: "<br> перенос строки" },
  hr: { body: `<hr>`, description: "<hr> горизонтальная линия" },
  strong: { body: `<strong>\${0}</strong>`, description: "<strong> жирный" },
  em: { body: `<em>\${0}</em>`, description: "<em> курсив" },
  code: { body: `<code>\${0}</code>`, description: "<code> код" },
  pre: { body: `<pre>\${0}</pre>`, description: "<pre> форматированный текст" },
  blockquote: { body: `<blockquote>\${0}</blockquote>`, description: "<blockquote> цитата" },
};

// ─── CSS Snippets ─────────────────────────────────────────────────────────────
const CSS_SNIPPETS: Record<string, { body: string; description: string }> = {
  flexbox: { body: `display: flex;\njustify-content: \${1:center};\nalign-items: \${2:center};`, description: "Flexbox контейнер" },
  grid: { body: `display: grid;\ngrid-template-columns: \${1:repeat(3, 1fr)};\ngap: \${2:1rem};`, description: "Grid контейнер" },
  "media-mobile": { body: `@media (max-width: 768px) {\n    \${0}\n}`, description: "Media query для мобильных" },
  "box-shadow": { body: `box-shadow: \${1:0} \${2:4px} \${3:6px} rgba(0, 0, 0, \${4:0.1});`, description: "Тень блока" },
  transition: { body: `transition: \${1:all} \${2:0.3s} \${3:ease};`, description: "Плавный переход" },
  animation: { body: `animation: \${1:name} \${2:1s} \${3:ease-in-out} \${4:infinite};`, description: "Анимация" },
  gradient: { body: `background: linear-gradient(\${1:135deg}, \${2:#667eea}, \${3:#764ba2});`, description: "Градиент" },
};

// ─── JS Snippets ──────────────────────────────────────────────────────────────
const JS_SNIPPETS: Record<string, { body: string; description: string }> = {
  log: { body: `console.log(\${1:'значение'});`, description: "console.log()" },
  fn: { body: `function \${1:имяФункции}(\${2:params}) {\n    \${0}\n}`, description: "Функция" },
  afn: { body: `const \${1:имяФункции} = (\${2:params}) => {\n    \${0}\n};`, description: "Стрелочная функция" },
  cl: { body: `class \${1:ИмяКласса} {\n    constructor(\${2:params}) {\n        \${0}\n    }\n}`, description: "Класс" },
  for: { body: `for (let \${1:i} = 0; \${1:i} < \${2:array}.length; \${1:i}++) {\n    \${0}\n}`, description: "Цикл for" },
  forof: { body: `for (const \${1:item} of \${2:array}) {\n    \${0}\n}`, description: "Цикл for...of" },
  forEach: { body: `\${1:array}.forEach((\${2:item}) => {\n    \${0}\n});`, description: "forEach" },
  map: { body: `\${1:array}.map((\${2:item}) => \${0})`, description: "Array.map()" },
  filter: { body: `\${1:array}.filter((\${2:item}) => \${0})`, description: "Array.filter()" },
  reduce: { body: `\${1:array}.reduce((\${2:acc}, \${3:item}) => {\n    \${0}\n    return \${2:acc};\n}, \${4:initialValue})`, description: "Array.reduce()" },
  promise: { body: `new Promise((\${1:resolve}, \${2:reject}) => {\n    \${0}\n})`, description: "new Promise()" },
  async: { body: `async function \${1:имяФункции}(\${2:params}) {\n    try {\n        const result = await \${0};\n        return result;\n    } catch (error) {\n        console.error(error);\n    }\n}`, description: "async/await функция" },
  fetch: { body: `const response = await fetch('\${1:url}');\nconst data = await response.json();\nconsole.log(data);`, description: "fetch() запрос" },
  qs: { body: `document.querySelector('\${1:.selector}')`, description: "querySelector()" },
  qsa: { body: `document.querySelectorAll('\${1:.selector}')`, description: "querySelectorAll()" },
  gel: { body: `document.getElementById('\${1:id}')`, description: "getElementById()" },
  ae: { body: `\${1:element}.addEventListener('\${2:click}', (\${3:e}) => {\n    \${0}\n});`, description: "addEventListener()" },
  dom: { body: `document.addEventListener('DOMContentLoaded', () => {\n    \${0}\n});`, description: "DOMContentLoaded" },
  if: { body: `if (\${1:условие}) {\n    \${0}\n}`, description: "if условие" },
  ifel: { body: `if (\${1:условие}) {\n    \${2}\n} else {\n    \${0}\n}`, description: "if/else" },
  try: { body: `try {\n    \${0}\n} catch (error) {\n    console.error(error);\n}`, description: "try/catch" },
};

// ─── Python Snippets (OOP, типы, паттерны) ──────────────────────────────────
const PYTHON_SNIPPETS: Record<string, { body: string; description: string }> = {
  def: { body: `def \${1:name}(\${2:args}) -> \${3:None}:\n    """\${4:Описание функции.}\n\n    Args:\n        \${2:args}: \${5:описание}\n\n    Returns:\n        \${3:None}: \${6:описание}\n    """\n    \${0:pass}`, description: "Функция с docstring + type hints" },
  deftype: { body: `def \${1:name}(\${2:arg}: \${3:str}) -> \${4:None}:\n    \${0:pass}`, description: "Функция с type hints" },
  defasync: { body: `async def \${1:name}(\${2:args}) -> \${3:None}:\n    \${0:pass}`, description: "Async функция" },
  lam: { body: `lambda \${1:x}: \${0:x}`, description: "Lambda" },
  class: { body: `class \${1:Name}:\n    """\${2:Описание класса.}\n\n    Attributes:\n        \${3:attr}: \${4:описание}\n    """\n\n    def __init__(self, \${5:args}) -> None:\n        \${0:pass}`, description: "Класс с docstring" },
  classfull: { body: `class \${1:Name}:\n    """\${2:Описание.}"""\n\n    def __init__(self, name: str) -> None:\n        self._name = name\n\n    def __repr__(self) -> str:\n        return f"\${1:Name}(name={self._name!r})"\n\n    def __str__(self) -> str:\n        return self._name\n\n    def __eq__(self, other: object) -> bool:\n        if not isinstance(other, \${1:Name}):\n            return NotImplemented\n        return self._name == other._name\n\n    \${0}`, description: "Полный класс (init, repr, str, eq)" },
  classinherit: { body: `class \${1:Child}(\${2:Parent}):\n    """\${3:Описание.}"""\n\n    def __init__(self, \${4:args}) -> None:\n        super().__init__(\${5:})\n        \${0:pass}`, description: "Класс с наследованием" },
  classabstract: { body: `from abc import ABC, abstractmethod\n\nclass \${1:Base}(ABC):\n    """\${2:Абстрактный базовый класс.}"""\n\n    @abstractmethod\n    def \${3:method}(self) -> \${4:None}:\n        """\${5:Должен быть переопределён.}"""\n        \${0}`, description: "Абстрактный класс (ABC)" },
  classenum: { body: `from enum import Enum\n\nclass \${1:Color}(Enum):\n    \${2:RED} = "\${3:red}"\n    \${0}`, description: "Enum класс" },
  dataclass: { body: `from dataclasses import dataclass, field\n\n@dataclass\nclass \${1:Name}:\n    """\${2:Описание.}"""\n    \${3:field}: \${4:str}\n    \${5:items}: list[\${6:int}] = field(default_factory=list)\n    \${0}`, description: "Dataclass с типами" },
  dataclassfrozen: { body: `from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass \${1:Name}:\n    """\${2:Иммутабельный dataclass.}"""\n    \${3:field}: \${4:str}\n    \${0}`, description: "Frozen dataclass" },
  init: { body: `def __init__(self, \${1:args}) -> None:\n    \${0:pass}`, description: "__init__" },
  repr: { body: `def __repr__(self) -> str:\n    return f"\${1:Class}(\${0})"`, description: "__repr__" },
  str: { body: `def __str__(self) -> str:\n    return \${0:""}`, description: "__str__" },
  eq: { body: `def __eq__(self, other: object) -> bool:\n    if not isinstance(other, \${1:Class}):\n        return NotImplemented\n    return \${0}`, description: "__eq__" },
  hash: { body: `def __hash__(self) -> int:\n    return hash((\${0}))`, description: "__hash__" },
  iter: { body: `def __iter__(self):\n    \${0:return iter(self._items)}`, description: "__iter__" },
  enter: { body: `def __enter__(self):\n    \${1:return self}\n\ndef __exit__(self, exc_type, exc_val, exc_tb) -> None:\n    \${0:pass}`, description: "Context manager (with)" },
  prop: { body: `@property\ndef \${1:name}(self) -> \${2:str}:\n    """\${3:Описание.}"""\n    return self._\${1:name}\n\n@\${1:name}.setter\ndef \${1:name}(self, value: \${2:str}) -> None:\n    self._\${1:name} = value\n    \${0}`, description: "Property (getter/setter)" },
  staticm: { body: `@staticmethod\ndef \${1:method}(\${2:args}) -> \${3:None}:\n    \${0:pass}`, description: "Static method" },
  classm: { body: `@classmethod\ndef \${1:method}(cls, \${2:args}) -> "\${3:Class}":\n    \${0:return cls()}`, description: "Class method" },
  decorator: { body: `from functools import wraps\n\ndef \${1:decorator}(func):\n    @wraps(func)\n    def wrapper(*args, **kwargs):\n        \${2:# до}\n        result = func(*args, **kwargs)\n        \${3:# после}\n        return result\n    return wrapper\n\${0}`, description: "Декоратор функции" },
  for: { body: `for \${1:item} in \${2:iterable}:\n    \${0:pass}`, description: "For loop" },
  forr: { body: `for \${1:i} in range(\${2:10}):\n    \${0:pass}`, description: "For loop с range" },
  forenum: { body: `for \${1:i}, \${2:item} in enumerate(\${3:iterable}):\n    \${0:pass}`, description: "For с enumerate" },
  forzip: { body: `for \${1:a}, \${2:b} in zip(\${3:list1}, \${4:list2}):\n    \${0:pass}`, description: "For с zip" },
  while: { body: `while \${1:condition}:\n    \${0:pass}`, description: "While loop" },
  if: { body: `if \${1:condition}:\n    \${0:pass}`, description: "If statement" },
  ife: { body: `if \${1:condition}:\n    \${2:pass}\nelse:\n    \${0:pass}`, description: "If/Else" },
  ifelif: { body: `if \${1:condition}:\n    \${2:pass}\nelif \${3:condition}:\n    \${4:pass}\nelse:\n    \${0:pass}`, description: "If/Elif/Else" },
  match: { body: `match \${1:value}:\n    case \${2:pattern}:\n        \${3:pass}\n    case _:\n        \${0:pass}`, description: "Match/case (3.10+)" },
  try: { body: `try:\n    \${1:pass}\nexcept \${2:Exception} as \${3:e}:\n    \${0:pass}`, description: "Try/Except" },
  tryf: { body: `try:\n    \${1:pass}\nexcept \${2:Exception} as e:\n    \${3:pass}\nfinally:\n    \${0:pass}`, description: "Try/Except/Finally" },
  raise: { body: `raise \${1:ValueError}("\${0:сообщение}")`, description: "Raise exception" },
  main: { body: `def main() -> None:\n    \${1:pass}\n\nif __name__ == "__main__":\n    main()`, description: "Main блок" },
  open: { body: `with open("\${1:file.txt}", "\${2:r}", encoding="utf-8") as \${3:f}:\n    \${0:content = f.read()}`, description: "Open file (UTF-8)" },
  json: { body: `import json\n\nwith open("\${1:data.json}", "r", encoding="utf-8") as f:\n    data = json.load(f)\n\${0}`, description: "Read JSON" },
  jsondump: { body: `import json\n\nwith open("\${1:data.json}", "w", encoding="utf-8") as f:\n    json.dump(\${2:data}, f, ensure_ascii=False, indent=2)\${0}`, description: "Write JSON" },
  listc: { body: `[\${1:x} for \${1:x} in \${2:iterable} if \${3:condition}]`, description: "List comprehension" },
  dictc: { body: `{\${1:k}: \${2:v} for \${1:k}, \${2:v} in \${3:iterable.items()}}`, description: "Dict comprehension" },
  setc: { body: `{\${1:x} for \${1:x} in \${2:iterable}}`, description: "Set comprehension" },
  genc: { body: `(\${1:x} for \${1:x} in \${2:iterable})`, description: "Generator expression" },
  imp: { body: `import \${0:module}`, description: "Import" },
  from: { body: `from \${1:module} import \${0:name}`, description: "From import" },
  print: { body: `print(\${1:value})`, description: "Print" },
  printf: { body: `print(f"\${1:text} {\${2:value}}")`, description: "Print f-string" },
  input: { body: `\${1:var} = input("\${0:prompt: }")`, description: "Input" },
  inputi: { body: `\${1:var} = int(input("\${0:prompt: }"))`, description: "Input int" },
  typeddict: { body: `from typing import TypedDict\n\nclass \${1:Name}(TypedDict):\n    \${2:key}: \${3:str}\n    \${0}`, description: "TypedDict" },
  optional: { body: `from typing import Optional\n\n\${1:var}: Optional[\${2:str}] = \${0:None}`, description: "Optional type hint" },
  listtype: { body: `from typing import List\n\n\${1:var}: List[\${2:str}] = \${0:[]}`, description: "List type hint" },
  dicttype: { body: `from typing import Dict\n\n\${1:var}: Dict[\${2:str}, \${3:int}] = \${0:{}}`, description: "Dict type hint" },
  protocol: { body: `from typing import Protocol\n\nclass \${1:Drawable}(Protocol):\n    """\${2:Структурный интерфейс.}"""\n    def \${3:draw}(self) -> \${4:None}: ...\n\${0}`, description: "Protocol (структурная типизация)" },
  generic: { body: `from typing import TypeVar, Generic\n\nT = TypeVar("T")\n\nclass \${1:Stack}(Generic[T]):\n    """\${2:Generic контейнер.}"""\n    def __init__(self) -> None:\n        self._items: list[T] = []\n    \${0}`, description: "Generic класс" },

  // ─── Web: Flask ──────────────────────────────────────────────────────────
  flaskapp: { body: `from flask import Flask, request, jsonify, render_template\n\napp = Flask(__name__)\n\n@app.route("/")\ndef index():\n    return render_template("index.html")\n\n@app.route("/api/\${1:hello}", methods=["GET"])\ndef \${1:hello}():\n    return jsonify({"message": "\${2:Hello}"})\n\nif __name__ == "__main__":\n    app.run(debug=True, port=\${3:5000})\n\${0}`, description: "Flask приложение полное" },
  flaskroute: { body: `@app.route("/\${1:path}", methods=["\${2:GET}"])\ndef \${3:handler}():\n    \${0:return jsonify({"ok": True})}`, description: "Flask маршрут" },
  flaskpost: { body: `@app.route("/\${1:path}", methods=["POST"])\ndef \${2:handler}():\n    data = request.get_json()\n    \${0}\n    return jsonify({"ok": True})`, description: "Flask POST с JSON" },

  // ─── Web: FastAPI ────────────────────────────────────────────────────────
  fastapiapp: { body: `from fastapi import FastAPI\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass \${1:Item}(BaseModel):\n    \${2:name}: str\n\n@app.get("/")\nasync def root():\n    return {"message": "Hello"}\n\n@app.post("/\${3:items}")\nasync def create_\${3:items}(item: \${1:Item}):\n    return item\n\${0}`, description: "FastAPI приложение полное" },
  fastapiget: { body: `@app.get("/\${1:path}")\nasync def \${2:handler}() -> dict:\n    \${0:return {"ok": True}}`, description: "FastAPI GET" },
  fastapipost: { body: `@app.post("/\${1:path}")\nasync def \${2:handler}(item: \${3:Item}) -> dict:\n    \${0:return {"ok": True}}`, description: "FastAPI POST" },
  pydantic: { body: `from pydantic import BaseModel, Field\n\nclass \${1:Schema}(BaseModel):\n    """\${2:Описание схемы.}"""\n    \${3:name}: str = Field(..., description="\${4:описание поля}")\n    \${5:age}: int = \${6:0}\n    \${0}`, description: "Pydantic модель" },

  // ─── Web: Django ─────────────────────────────────────────────────────────
  djangoview: { body: `from django.http import JsonResponse\nfrom django.views.decorators.http import require_http_methods\n\n@require_http_methods(["\${1:GET}"])\ndef \${2:view_name}(request):\n    \${0:return JsonResponse({"ok": True})}`, description: "Django function view" },
  djangocbv: { body: `from django.views import View\nfrom django.http import JsonResponse\n\nclass \${1:Name}View(View):\n    """\${2:Описание view.}"""\n\n    def get(self, request, *args, **kwargs):\n        \${0:return JsonResponse({"ok": True})}`, description: "Django Class-Based View" },
  djangomodel: { body: `from django.db import models\n\nclass \${1:Name}(models.Model):\n    """\${2:Описание модели.}"""\n    \${3:title} = models.CharField(max_length=\${4:200})\n    created_at = models.DateTimeField(auto_now_add=True)\n\n    class Meta:\n        ordering = ["-created_at"]\n\n    def __str__(self) -> str:\n        return self.\${3:title}\n\${0}`, description: "Django модель" },
  drfserializer: { body: `from rest_framework import serializers\nfrom .models import \${1:Model}\n\nclass \${1:Model}Serializer(serializers.ModelSerializer):\n    class Meta:\n        model = \${1:Model}\n        fields = "__all__"\n\${0}`, description: "DRF Serializer" },
  drfviewset: { body: `from rest_framework import viewsets\nfrom .models import \${1:Model}\nfrom .serializers import \${1:Model}Serializer\n\nclass \${1:Model}ViewSet(viewsets.ModelViewSet):\n    queryset = \${1:Model}.objects.all()\n    serializer_class = \${1:Model}Serializer\n\${0}`, description: "DRF ViewSet" },

  // ─── HTTP клиенты ────────────────────────────────────────────────────────
  reqget: { body: `import requests\n\nresponse = requests.get("\${1:https://api.example.com}")\nresponse.raise_for_status()\ndata = response.json()\n\${0}`, description: "requests GET" },
  reqpost: { body: `import requests\n\nresponse = requests.post(\n    "\${1:https://api.example.com}",\n    json={\${2}},\n    headers={"Content-Type": "application/json"},\n)\nresponse.raise_for_status()\n\${0}`, description: "requests POST" },
  httpx: { body: `import httpx\n\nasync with httpx.AsyncClient() as client:\n    response = await client.get("\${1:https://api.example.com}")\n    data = response.json()\n\${0}`, description: "httpx async GET" },

  // ─── Базы данных ─────────────────────────────────────────────────────────
  sqlite: { body: `import sqlite3\n\nwith sqlite3.connect("\${1:db.sqlite3}") as conn:\n    conn.row_factory = sqlite3.Row\n    cursor = conn.cursor()\n    cursor.execute("\${2:SELECT * FROM table}")\n    rows = cursor.fetchall()\n    \${0}`, description: "SQLite запрос" },
  sqlmodel: { body: `from sqlmodel import SQLModel, Field\n\nclass \${1:Name}(SQLModel, table=True):\n    id: int | None = Field(default=None, primary_key=True)\n    \${2:name}: str\n    \${0}`, description: "SQLModel таблица" },

  // ─── Тесты ───────────────────────────────────────────────────────────────
  pytest: { body: `import pytest\n\ndef test_\${1:name}() -> None:\n    """\${2:Тест описание.}"""\n    \${0:assert True}`, description: "Pytest тест" },
  pytestfix: { body: `@pytest.fixture\ndef \${1:name}():\n    """\${2:Fixture описание.}"""\n    \${0:return ...}`, description: "Pytest fixture" },
  pytestparam: { body: `@pytest.mark.parametrize("\${1:input,expected}", [\n    (\${2:1}, \${3:2}),\n    (\${4:3}, \${5:4}),\n])\ndef test_\${6:name}(\${1:input,expected}) -> None:\n    \${0:assert ...}`, description: "Pytest параметризация" },

  // ─── Логирование / CLI ───────────────────────────────────────────────────
  logger: { body: `import logging\n\nlogging.basicConfig(\n    level=logging.\${1:INFO},\n    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",\n)\nlogger = logging.getLogger(__name__)\n\${0}`, description: "Logging setup" },
  argparse: { body: `import argparse\n\ndef main() -> None:\n    parser = argparse.ArgumentParser(description="\${1:описание}")\n    parser.add_argument("\${2:--name}", type=str, required=True, help="\${3:help}")\n    args = parser.parse_args()\n    \${0}\n\nif __name__ == "__main__":\n    main()`, description: "Argparse CLI" },

  // ─── Async ───────────────────────────────────────────────────────────────
  asyncmain: { body: `import asyncio\n\nasync def main() -> None:\n    \${0:pass}\n\nif __name__ == "__main__":\n    asyncio.run(main())`, description: "Async main" },
  asyncgather: { body: `results = await asyncio.gather(\n    \${1:task1()},\n    \${2:task2()},\n)\n\${0}`, description: "asyncio.gather" },

  // ─── PyCharm Live Templates (классика) ───────────────────────────────────
  // self-shortcuts (PyCharm style)
  "self.": { body: `self.\${1:attr} = \${1:attr}\${0}`, description: "self.attr = attr" },
  selfa: { body: `self.\${1:attr} = \${2:value}\${0}`, description: "self.attr = value" },
  // logger тricks (theY4Kman-style)
  log: { body: `logger = logging.getLogger(__name__)\${0}`, description: "logger = getLogger(__name__)" },
  logd: { body: `logger.debug(\${1:"%s"}, \${0:value})`, description: "logger.debug" },
  logi: { body: `logger.info(\${1:"%s"}, \${0:value})`, description: "logger.info" },
  logw: { body: `logger.warning(\${1:"%s"}, \${0:value})`, description: "logger.warning" },
  loge: { body: `logger.error(\${1:"%s"}, \${0:value})`, description: "logger.error" },
  logx: { body: `logger.exception(\${0:"произошла ошибка"})`, description: "logger.exception (с traceback)" },
  // debug / pretty print
  pp: { body: `from pprint import pprint\npprint(\${0:value})`, description: "pprint" },
  ppr: { body: `__import__("pprint").pprint(\${0:value})`, description: "pprint inline (без import)" },
  pdb: { body: `import pdb; pdb.set_trace()  \${0:# breakpoint}`, description: "pdb breakpoint" },
  bp: { body: `breakpoint()  \${0:# Python 3.7+}`, description: "breakpoint() (3.7+)" },
  ipdb: { body: `import ipdb; ipdb.set_trace()`, description: "ipdb breakpoint" },
  rich: { body: `from rich import print as rprint\nrprint(\${0:value})`, description: "rich print" },
  // dict-трюки
  ddict: { body: `from collections import defaultdict\n\n\${1:counts}: defaultdict[\${2:str}, \${3:int}] = defaultdict(\${3:int})\n\${0}`, description: "defaultdict" },
  odict: { body: `from collections import OrderedDict\n\n\${1:d} = OrderedDict()\${0}`, description: "OrderedDict" },
  counter: { body: `from collections import Counter\n\n\${1:counts} = Counter(\${2:iterable})\n\${0}`, description: "Counter" },
  namedtup: { body: `from collections import namedtuple\n\n\${1:Point} = namedtuple("\${1:Point}", ["\${2:x}", "\${3:y}"])\n\${0}`, description: "namedtuple" },
  dictmerge: { body: `\${1:merged} = {**\${2:dict1}, **\${3:dict2}}\${0}`, description: "Слияние словарей (**)" },
  dictinv: { body: `\${1:inverted} = {v: k for k, v in \${2:original}.items()}\${0}`, description: "Инверсия словаря" },
  dictget: { body: `\${1:value} = \${2:d}.get("\${3:key}", \${0:default})`, description: "dict.get с default" },
  dictsetdef: { body: `\${1:d}.setdefault("\${2:key}", \${0:[]}).append(\${3:value})`, description: "setdefault + append" },
  // утилиты
  walrus: { body: `if (\${1:n} := len(\${2:items})) > \${3:0}:\n    \${0:print(n)}`, description: "Walrus оператор := (3.8+)" },
  unpack: { body: `\${1:first}, *\${2:rest} = \${0:iterable}`, description: "Распаковка с *rest" },
  ternary: { body: `\${1:value} = \${2:a} if \${3:condition} else \${0:b}`, description: "Тернарный оператор" },
  swap: { body: `\${1:a}, \${2:b} = \${2:b}, \${1:a}\${0}`, description: "Swap двух переменных" },
  // pathlib (современная работа с файлами)
  pathlib: { body: `from pathlib import Path\n\n\${1:path} = Path("\${2:file.txt}")\n\${0}`, description: "Pathlib импорт" },
  pathread: { body: `from pathlib import Path\n\ncontent = Path("\${1:file.txt}").read_text(encoding="utf-8")\n\${0}`, description: "Path.read_text" },
  pathwrite: { body: `from pathlib import Path\n\nPath("\${1:file.txt}").write_text(\${2:text}, encoding="utf-8")\${0}`, description: "Path.write_text" },
  pathiter: { body: `from pathlib import Path\n\nfor \${1:file} in Path("\${2:.}").rglob("\${3:*.py}"):\n    \${0:print(file)}`, description: "Path.rglob (рекурсивный поиск)" },
  // datetime
  now: { body: `from datetime import datetime\n\n\${1:now} = datetime.now()\${0}`, description: "datetime.now()" },
  utcnow: { body: `from datetime import datetime, timezone\n\n\${1:now} = datetime.now(timezone.utc)\${0}`, description: "UTC время (aware)" },
  // окружение
  envget: { body: `import os\n\n\${1:value} = os.getenv("\${2:VAR}", "\${0:default}")`, description: "os.getenv с default" },
  dotenv: { body: `from dotenv import load_dotenv\nimport os\n\nload_dotenv()\n\${1:VAR} = os.getenv("\${2:VAR}")\${0}`, description: "load_dotenv" },
  // performance
  timeit: { body: `import time\n\nstart = time.perf_counter()\n\${1:# код}\nelapsed = time.perf_counter() - start\nprint(f"Время: {elapsed:.4f}s")\${0}`, description: "Замер времени (perf_counter)" },
  cache: { body: `from functools import lru_cache\n\n@lru_cache(maxsize=\${1:128})\ndef \${2:func}(\${3:args}):\n    \${0:pass}`, description: "lru_cache декоратор" },
  // typing современный
  union: { body: `\${1:var}: \${2:int} | \${3:str} = \${0}`, description: "Union с | (3.10+)" },
  alias: { body: `from typing import TypeAlias\n\n\${1:Vector}: TypeAlias = list[\${2:float}]\${0}`, description: "TypeAlias (3.10+)" },
  literal: { body: `from typing import Literal\n\n\${1:Mode}: Literal["\${2:read}", "\${3:write}"] = "\${2:read}"\${0}`, description: "Literal type" },
  final: { body: `from typing import Final\n\n\${1:CONST}: Final[\${2:int}] = \${0:42}`, description: "Final константа" },
  cast: { body: `from typing import cast\n\n\${1:value} = cast(\${2:int}, \${0:obj})`, description: "typing.cast" },
  // итераторы / functools
  reduce: { body: `from functools import reduce\n\n\${1:result} = reduce(lambda a, b: \${2:a + b}, \${3:iterable}, \${0:0})`, description: "functools.reduce" },
  partial: { body: `from functools import partial\n\n\${1:fn} = partial(\${2:func}, \${0:arg})`, description: "functools.partial" },
  chain: { body: `from itertools import chain\n\n\${1:result} = list(chain(\${2:list1}, \${0:list2}))`, description: "itertools.chain" },
  groupby: { body: `from itertools import groupby\n\nfor \${1:key}, \${2:group} in groupby(sorted(\${3:items}), key=lambda x: \${4:x.attr}):\n    \${0:print(key, list(group))}`, description: "itertools.groupby" },
  // сериализация
  pickle: { body: `import pickle\n\nwith open("\${1:data.pkl}", "wb") as f:\n    pickle.dump(\${2:obj}, f)\${0}`, description: "pickle dump" },
  pickleload: { body: `import pickle\n\nwith open("\${1:data.pkl}", "rb") as f:\n    \${2:obj} = pickle.load(f)\${0}`, description: "pickle load" },
  // регулярки
  rematch: { body: `import re\n\n\${1:match} = re.match(r"\${2:pattern}", \${3:text})\nif \${1:match}:\n    \${0}`, description: "re.match" },
  refindall: { body: `import re\n\n\${1:matches} = re.findall(r"\${2:pattern}", \${0:text})`, description: "re.findall" },
  // shebang / encoding (вверху файла)
  shebang: { body: `#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n"""\${1:Описание модуля.}\n"""\n\${0}`, description: "Shebang + module docstring" },
  todo: { body: `# TODO(\${1:author}): \${0:описание}`, description: "TODO комментарий" },
  fixme: { body: `# FIXME: \${0:описание}`, description: "FIXME комментарий" },
};

// ─── Register language completions ───────────────────────────────────────────
function registerSnippetProvider(
  monacoInstance: typeof monaco,
  languageId: string,
  snippets: Record<string, { body: string; description: string }>,
  triggerChars: string[]
) {
  monacoInstance.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: triggerChars,
    provideCompletionItems: (model, position) => {
      const wordInfo = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endColumn: wordInfo.endColumn,
      };

      return {
        suggestions: Object.entries(snippets).map(([label, { body, description }]) => ({
          label,
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: body,
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: description,
          detail: description,
          range,
          sortText: "0" + label,
        })),
      };
    },
  });
}

// ─── AI Inline Ghost Text ────────────────────────────────────────────────────
let aiTimer: ReturnType<typeof setTimeout> | null = null;

function registerAiInlineCompletions(monacoInstance: typeof monaco) {
  monacoInstance.languages.registerInlineCompletionsProvider("python", createInlineProvider(monacoInstance));
  monacoInstance.languages.registerInlineCompletionsProvider("javascript", createInlineProvider(monacoInstance));
  monacoInstance.languages.registerInlineCompletionsProvider("html", createInlineProvider(monacoInstance));
  monacoInstance.languages.registerInlineCompletionsProvider("css", createInlineProvider(monacoInstance));
}

function createInlineProvider(_monacoInstance: typeof monaco): monaco.languages.InlineCompletionsProvider {
  return {
    provideInlineCompletions: async (model, position, _context, token) => {
      return new Promise((resolve) => {
        if (aiTimer) clearTimeout(aiTimer);

        aiTimer = setTimeout(async () => {
          if (token.isCancellationRequested) {
            resolve({ items: [] });
            return;
          }

          const content = model.getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 30),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          if (content.trim().length < 5) {
            resolve({ items: [] });
            return;
          }

          const completion = await getCodeCompletion(content, model.getLanguageId());
          if (!completion || token.isCancellationRequested) {
            resolve({ items: [] });
            return;
          }

          resolve({
            items: [{
              insertText: completion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            }],
          });
        }, 250); // 250ms debounce — быстрые подсказки
      });
    },
    freeInlineCompletions: () => { /* required by interface */ },
  } as any;
}

// ─── Right-click "Fix with AI" ───────────────────────────────────────────────
function registerFixAction(monacoInstance: typeof monaco, editor: monaco.editor.IStandaloneCodeEditor) {
  editor.addAction({
    id: "ai-fix-error",
    label: "🔧 Исправить с помощью AI",
    contextMenuGroupId: "1_modification",
    contextMenuOrder: 0,
    precondition: undefined,
    keybindings: [
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF,
    ],
    run: async (ed) => {
      const selection = ed.getSelection();
      if (!selection) return;

      const model = ed.getModel();
      if (!model) return;

      const selectedText = model.getValueInRange(selection);
      if (!selectedText.trim()) return;

      // Get markers (errors/warnings) in selection range
      const markers = monacoInstance.editor.getModelMarkers({ resource: model.uri });
      const relevantMarkers = markers.filter(m =>
        m.startLineNumber >= selection.startLineNumber &&
        m.endLineNumber <= selection.endLineNumber
      );

      const errorText = relevantMarkers.length > 0
        ? relevantMarkers.map(m => m.message).join('; ')
        : 'Исправь возможные ошибки в этом коде';

      // Show loading decoration
      const decorations = ed.createDecorationsCollection([{
        range: selection,
        options: {
          className: 'ai-fix-loading',
          inlineClassName: 'ai-fix-inline-loading',
        }
      }]);

      const fixedCode = await getCodeFix(selectedText, errorText, model.getLanguageId());

      decorations.clear();

      if (fixedCode && fixedCode !== selectedText) {
        ed.executeEdits("ai-fix", [{
          range: selection,
          text: fixedCode,
        }]);
      }
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
let completionsRegistered = false;

export default function CodeEditor({
  language,
  value,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Disable CSS false-positive warnings (relaxed validation)
    monacoInstance.languages.css?.cssDefaults?.setOptions?.({
      validate: true,
      lint: {
        compatibleVendorPrefixes: "ignore",
        vendorPrefix: "ignore",
        duplicateProperties: "ignore",
        emptyRules: "warning",
        importStatement: "ignore",
        boxModel: "ignore",
        universalSelector: "ignore",
        zeroUnits: "ignore",
        fontFaceProperties: "ignore",
        hexColorLength: "ignore",
        argumentsInColorFunction: "ignore",
        unknownProperties: "ignore",
        ieHack: "ignore",
        unknownVendorSpecificProperties: "ignore",
        propertyIgnoredDueToDisplay: "ignore",
        idSelector: "ignore",
        float: "ignore",
      },
    });

    // Register completions only once globally
    if (!completionsRegistered) {
      registerSnippetProvider(monacoInstance, "html", HTML_SNIPPETS, ["<", " ", "\t"]);
      registerSnippetProvider(monacoInstance, "css", CSS_SNIPPETS, [" ", ":", "\t"]);
      registerSnippetProvider(monacoInstance, "javascript", JS_SNIPPETS, [" ", ".", "\t"]);
      registerSnippetProvider(monacoInstance, "typescript", JS_SNIPPETS, [" ", ".", "\t"]);
      registerSnippetProvider(monacoInstance, "python", PYTHON_SNIPPETS, [" ", ".", "\t"]);
      registerAiInlineCompletions(monacoInstance);
      completionsRegistered = true;
    }

    // Register per-editor actions
    registerFixAction(monacoInstance, editor);
  };

  return (
    <div className="h-full min-h-[400px] border rounded-md overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border-b border-white/10">
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase tracking-widest">
          {language === "javascript" ? "JS" : language.toUpperCase()}
        </span>
        <span className="text-xs text-white/30">Tab — подсказка · Ctrl+Shift+F — AI исправление · ПКМ → Исправить</span>
      </div>

      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val || "")}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontLigatures: true,
          lineNumbers: "on",
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          scrollBeyondLastLine: false,
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: "inline", comments: false, strings: false },
          quickSuggestionsDelay: 200,
          acceptSuggestionOnCommitCharacter: false,
          acceptSuggestionOnEnter: "off",
          tabCompletion: "on",
          wordBasedSuggestions: "off",
          snippetSuggestions: "inline",
          suggest: {
            insertMode: "insert",
            showSnippets: true,
            showKeywords: true,
            showFunctions: true,
            showVariables: true,
            showClasses: true,
            showModules: true,
            showProperties: true,
            showMethods: true,
            filterGraceful: true,
            localityBonus: true,
            preview: false,
            showStatusBar: false,
            snippetsPreventQuickSuggestions: true,
          },
          inlineSuggest: { enabled: true, mode: "prefix", suppressSuggestions: false },
          parameterHints: { enabled: true, cycle: true },
          formatOnPaste: false,
          formatOnType: false,
          autoClosingBrackets: "languageDefined",
          autoClosingQuotes: "languageDefined",
          autoClosingDelete: "auto",
          autoSurround: "languageDefined",
          matchBrackets: "always",
          bracketPairColorization: { enabled: true },
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          mouseWheelZoom: true,
          padding: { top: 8, bottom: 8 },
          folding: true,
          foldingHighlight: true,
          showFoldingControls: "mouseover",
          guides: { bracketPairs: true, indentation: true },
          hover: { enabled: true, delay: 300 },
        }}
      />
    </div>
  );
}
