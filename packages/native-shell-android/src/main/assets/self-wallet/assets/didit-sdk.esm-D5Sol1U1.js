/**
 * Didit SDK for Web v0.1.8
 * (c) 2026 Didit
 * @license MIT
 */const c={zIndex:9999,showCloseButton:!0,showExitConfirmation:!0,loggingEnabled:!1},a={overlay:"didit-modal-overlay",container:"didit-modal-container",iframe:"didit-verification-iframe",closeButton:"didit-close-button",loading:"didit-loading",confirmOverlay:"didit-confirm-overlay",confirmBox:"didit-confirm-box",embedded:"didit-embedded"},u=["ar","bg","bn","ca","cnr","cs","da","de","el","en","es","et","fa","fi","fr","he","hi","hr","hu","hy","id","it","ja","ka","ko","lt","lv","mk","ms","nl","no","pl","pt-BR","pt","ro","ru","sk","sl","so","sr","sv","th","tr","uk","uz","vi","zh-CN","zh-TW","zh"];class s{static get isEnabled(){return this._enabled}static set isEnabled(e){this._enabled=e}static log(...e){this._enabled&&console.log("[DiditSDK]",...e)}static warn(...e){this._enabled&&console.warn("[DiditSDK]",...e)}static error(...e){this._enabled&&console.error("[DiditSDK]",...e)}}s._enabled=!1;function E(){return`didit-modal-${Date.now()}-${Math.random().toString(36).substr(2,9)}`}function T(r){try{return new URL(r).hostname.endsWith(".didit.me")}catch{return!1}}function M(r,e){return{type:r,message:e||{sessionExpired:"Your verification session has expired.",networkError:"A network error occurred. Please try again.",cameraAccessDenied:"Camera access is required for verification.",unknown:e||"An unknown error occurred."}[r]}}function D(r){try{const{pathname:n}=new URL(r),t=n.split("/").filter(Boolean)[0];if(t&&u.includes(t))return t}catch{}const e=navigator.language;if(u.includes(e))return e;const i=e.split("-")[0];return u.includes(i)?i:"en"}const w={exitTitle:"Exit verification?",exitMessage:"Exiting will end your verification process. Are you sure?",continueButton:"Continue",exitButton:"Exit",ariaLabelModal:"Didit Verification",ariaLabelClose:"Close verification"},z={ar:{exitTitle:"الخروج من التحقق؟",exitMessage:"سيؤدي الخروج إلى إنهاء عملية التحقق الخاصة بك. هل أنت متأكد؟",continueButton:"متابعة",exitButton:"خروج",ariaLabelModal:"التحقق من Didit",ariaLabelClose:"إغلاق التحقق"},bg:{exitTitle:"Излизане от верификацията?",exitMessage:"Излизането ще прекрати процеса на верификация. Сигурни ли сте?",continueButton:"Продължи",exitButton:"Изход",ariaLabelModal:"Верификация Didit",ariaLabelClose:"Затваряне на верификацията"},bn:{exitTitle:"যাচাইকরণ থেকে বের হবেন?",exitMessage:"বের হলে আপনার যাচাইকরণ প্রক্রিয়া শেষ হয়ে যাবে। আপনি কি নিশ্চিত?",continueButton:"চালিয়ে যান",exitButton:"বের হন",ariaLabelModal:"Didit যাচাইকরণ",ariaLabelClose:"যাচাইকরণ বন্ধ করুন"},ca:{exitTitle:"Sortir de la verificació?",exitMessage:"Sortir finalitzarà el procés de verificació. N'esteu segur?",continueButton:"Continua",exitButton:"Sortir",ariaLabelModal:"Verificació Didit",ariaLabelClose:"Tancar verificació"},cnr:{exitTitle:"Izaći iz verifikacije?",exitMessage:"Izlaskom ćete prekinuti proces verifikacije. Jeste li sigurni?",continueButton:"Nastavi",exitButton:"Izađi",ariaLabelModal:"Didit verifikacija",ariaLabelClose:"Zatvori verifikaciju"},cs:{exitTitle:"Opustit ověření?",exitMessage:"Odchodem ukončíte proces ověření. Jste si jisti?",continueButton:"Pokračovat",exitButton:"Odejít",ariaLabelModal:"Ověření Didit",ariaLabelClose:"Zavřít ověření"},da:{exitTitle:"Forlad verifikation?",exitMessage:"Hvis du forlader, afsluttes din verifikationsproces. Er du sikker?",continueButton:"Fortsæt",exitButton:"Forlad",ariaLabelModal:"Didit-verifikation",ariaLabelClose:"Luk verifikation"},de:{exitTitle:"Verifizierung verlassen?",exitMessage:"Das Verlassen beendet Ihren Verifizierungsprozess. Sind Sie sicher?",continueButton:"Fortfahren",exitButton:"Verlassen",ariaLabelModal:"Didit-Verifizierung",ariaLabelClose:"Verifizierung schließen"},el:{exitTitle:"Έξοδος από την επαλήθευση;",exitMessage:"Η έξοδος θα τερματίσει τη διαδικασία επαλήθευσης. Είστε σίγουροι;",continueButton:"Συνέχεια",exitButton:"Έξοδος",ariaLabelModal:"Επαλήθευση Didit",ariaLabelClose:"Κλείσιμο επαλήθευσης"},en:w,es:{exitTitle:"¿Salir de la verificación?",exitMessage:"Salir terminará tu proceso de verificación. ¿Estás seguro?",continueButton:"Continuar",exitButton:"Salir",ariaLabelModal:"Verificación Didit",ariaLabelClose:"Cerrar verificación"},et:{exitTitle:"Lahkuda kinnitamisest?",exitMessage:"Lahkumine lõpetab teie kinnitamisprotsessi. Kas olete kindel?",continueButton:"Jätka",exitButton:"Lahku",ariaLabelModal:"Didit kinnitus",ariaLabelClose:"Sulge kinnitus"},fa:{exitTitle:"خروج از تأیید هویت؟",exitMessage:"خروج باعث پایان فرآیند تأیید هویت شما می‌شود. آیا مطمئن هستید؟",continueButton:"ادامه",exitButton:"خروج",ariaLabelModal:"تأیید هویت Didit",ariaLabelClose:"بستن تأیید هویت"},fi:{exitTitle:"Poistu vahvistuksesta?",exitMessage:"Poistuminen päättää vahvistusprosessisi. Oletko varma?",continueButton:"Jatka",exitButton:"Poistu",ariaLabelModal:"Didit-vahvistus",ariaLabelClose:"Sulje vahvistus"},fr:{exitTitle:"Quitter la vérification ?",exitMessage:"Quitter mettra fin à votre processus de vérification. Êtes-vous sûr ?",continueButton:"Continuer",exitButton:"Quitter",ariaLabelModal:"Vérification Didit",ariaLabelClose:"Fermer la vérification"},he:{exitTitle:"לצאת מהאימות?",exitMessage:"יציאה תסיים את תהליך האימות שלך. האם אתה בטוח?",continueButton:"המשך",exitButton:"יציאה",ariaLabelModal:"אימות Didit",ariaLabelClose:"סגירת אימות"},hi:{exitTitle:"सत्यापन से बाहर निकलें?",exitMessage:"बाहर निकलने से आपकी सत्यापन प्रक्रिया समाप्त हो जाएगी। क्या आप सुनिश्चित हैं?",continueButton:"जारी रखें",exitButton:"बाहर निकलें",ariaLabelModal:"Didit सत्यापन",ariaLabelClose:"सत्यापन बंद करें"},hr:{exitTitle:"Izaći iz verifikacije?",exitMessage:"Izlaskom ćete prekinuti proces verifikacije. Jeste li sigurni?",continueButton:"Nastavi",exitButton:"Izađi",ariaLabelModal:"Didit verifikacija",ariaLabelClose:"Zatvori verifikaciju"},hu:{exitTitle:"Kilépés az ellenőrzésből?",exitMessage:"A kilépés befejezi az ellenőrzési folyamatot. Biztos benne?",continueButton:"Folytatás",exitButton:"Kilépés",ariaLabelModal:"Didit ellenőrzés",ariaLabelClose:"Ellenőrzés bezárása"},hy:{exitTitle:"Դուրս գա՞լ ստուգումից",exitMessage:"Դուրս գալը կավարտի ձեր ստուգման գործընթացը։ Համոզված ե՞ք?",continueButton:"Շարունակել",exitButton:"Դուրս գալ",ariaLabelModal:"Didit ստուգում",ariaLabelClose:"Փակել ստուգումը"},id:{exitTitle:"Keluar dari verifikasi?",exitMessage:"Keluar akan mengakhiri proses verifikasi Anda. Apakah Anda yakin?",continueButton:"Lanjutkan",exitButton:"Keluar",ariaLabelModal:"Verifikasi Didit",ariaLabelClose:"Tutup verifikasi"},it:{exitTitle:"Uscire dalla verifica?",exitMessage:"L'uscita terminerà il processo di verifica. Sei sicuro?",continueButton:"Continua",exitButton:"Esci",ariaLabelModal:"Verifica Didit",ariaLabelClose:"Chiudi verifica"},ja:{exitTitle:"認証を終了しますか？",exitMessage:"終了すると認証プロセスが中断されます。よろしいですか？",continueButton:"続ける",exitButton:"終了",ariaLabelModal:"Didit 認証",ariaLabelClose:"認証を閉じる"},ka:{exitTitle:"გამოსვლა შემოწმებიდან?",exitMessage:"გამოსვლა დაასრულებს თქვენს შემოწმების პროცესს. დარწმუნებული ხართ?",continueButton:"გაგრძელება",exitButton:"გამოსვლა",ariaLabelModal:"Didit შემოწმება",ariaLabelClose:"შემოწმების დახურვა"},ko:{exitTitle:"인증을 종료하시겠습니까?",exitMessage:"종료하면 인증 절차가 중단됩니다. 확실하십니까?",continueButton:"계속",exitButton:"종료",ariaLabelModal:"Didit 인증",ariaLabelClose:"인증 닫기"},lt:{exitTitle:"Išeiti iš patvirtinimo?",exitMessage:"Išėjimas nutrauks jūsų patvirtinimo procesą. Ar esate tikri?",continueButton:"Tęsti",exitButton:"Išeiti",ariaLabelModal:"Didit patvirtinimas",ariaLabelClose:"Uždaryti patvirtinimą"},lv:{exitTitle:"Iziet no verifikācijas?",exitMessage:"Iziešana pārtrauks jūsu verifikācijas procesu. Vai esat pārliecināts?",continueButton:"Turpināt",exitButton:"Iziet",ariaLabelModal:"Didit verifikācija",ariaLabelClose:"Aizvērt verifikāciju"},mk:{exitTitle:"Излези од верификацијата?",exitMessage:"Излегувањето ќе го прекине процесот на верификација. Дали сте сигурни?",continueButton:"Продолжи",exitButton:"Излези",ariaLabelModal:"Верификација Didit",ariaLabelClose:"Затвори верификација"},ms:{exitTitle:"Keluar dari pengesahan?",exitMessage:"Keluar akan menamatkan proses pengesahan anda. Adakah anda pasti?",continueButton:"Teruskan",exitButton:"Keluar",ariaLabelModal:"Pengesahan Didit",ariaLabelClose:"Tutup pengesahan"},nl:{exitTitle:"Verificatie verlaten?",exitMessage:"Verlaten beëindigt uw verificatieproces. Weet u het zeker?",continueButton:"Doorgaan",exitButton:"Verlaten",ariaLabelModal:"Didit-verificatie",ariaLabelClose:"Verificatie sluiten"},no:{exitTitle:"Forlat verifisering?",exitMessage:"Å forlate vil avslutte verifiseringsprosessen. Er du sikker?",continueButton:"Fortsett",exitButton:"Forlat",ariaLabelModal:"Didit-verifisering",ariaLabelClose:"Lukk verifisering"},pl:{exitTitle:"Czy wyjść z weryfikacji?",exitMessage:"Wyjście zakończy proces weryfikacji. Czy na pewno?",continueButton:"Kontynuuj",exitButton:"Wyjdź",ariaLabelModal:"Weryfikacja Didit",ariaLabelClose:"Zamknij weryfikację"},"pt-BR":{exitTitle:"Sair da verificação?",exitMessage:"Sair encerrará seu processo de verificação. Tem certeza?",continueButton:"Continuar",exitButton:"Sair",ariaLabelModal:"Verificação Didit",ariaLabelClose:"Fechar verificação"},pt:{exitTitle:"Sair da verificação?",exitMessage:"Sair terminará o seu processo de verificação. Tem a certeza?",continueButton:"Continuar",exitButton:"Sair",ariaLabelModal:"Verificação Didit",ariaLabelClose:"Fechar verificação"},ro:{exitTitle:"Ieși din verificare?",exitMessage:"Ieșirea va încheia procesul de verificare. Ești sigur?",continueButton:"Continuă",exitButton:"Ieși",ariaLabelModal:"Verificare Didit",ariaLabelClose:"Închide verificarea"},ru:{exitTitle:"Выйти из верификации?",exitMessage:"Выход завершит процесс верификации. Вы уверены?",continueButton:"Продолжить",exitButton:"Выйти",ariaLabelModal:"Верификация Didit",ariaLabelClose:"Закрыть верификацию"},sk:{exitTitle:"Opustiť overenie?",exitMessage:"Odchodom ukončíte proces overenia. Ste si istí?",continueButton:"Pokračovať",exitButton:"Odísť",ariaLabelModal:"Overenie Didit",ariaLabelClose:"Zavrieť overenie"},sl:{exitTitle:"Zapustiti preverjanje?",exitMessage:"Izhod bo prekinil postopek preverjanja. Ali ste prepričani?",continueButton:"Nadaljuj",exitButton:"Izhod",ariaLabelModal:"Preverjanje Didit",ariaLabelClose:"Zapri preverjanje"},so:{exitTitle:"Ka baxdo xaqiijinta?",exitMessage:"Ka bixitaanku wuxuu dhammayn doonaa habka xaqiijintaada. Ma hubtaa?",continueButton:"Sii wad",exitButton:"Ka bax",ariaLabelModal:"Xaqiijinta Didit",ariaLabelClose:"Xir xaqiijinta"},sr:{exitTitle:"Изаћи из верификације?",exitMessage:"Изласком ћете прекинути процес верификације. Да ли сте сигурни?",continueButton:"Настави",exitButton:"Изађи",ariaLabelModal:"Верификација Didit",ariaLabelClose:"Затвори верификацију"},sv:{exitTitle:"Lämna verifiering?",exitMessage:"Att lämna avslutar din verifieringsprocess. Är du säker?",continueButton:"Fortsätt",exitButton:"Lämna",ariaLabelModal:"Didit-verifiering",ariaLabelClose:"Stäng verifiering"},th:{exitTitle:"ออกจากการยืนยันตัวตน?",exitMessage:"การออกจะสิ้นสุดกระบวนการยืนยันตัวตนของคุณ คุณแน่ใจหรือไม่?",continueButton:"ดำเนินการต่อ",exitButton:"ออก",ariaLabelModal:"การยืนยันตัวตน Didit",ariaLabelClose:"ปิดการยืนยันตัวตน"},tr:{exitTitle:"Doğrulamadan çıkmak istiyor musunuz?",exitMessage:"Çıkış, doğrulama sürecinizi sonlandıracak. Emin misiniz?",continueButton:"Devam et",exitButton:"Çıkış",ariaLabelModal:"Didit doğrulama",ariaLabelClose:"Doğrulamayı kapat"},uk:{exitTitle:"Вийти з верифікації?",exitMessage:"Вихід завершить процес верифікації. Ви впевнені?",continueButton:"Продовжити",exitButton:"Вийти",ariaLabelModal:"Верифікація Didit",ariaLabelClose:"Закрити верифікацію"},uz:{exitTitle:"Tekshiruvdan chiqasizmi?",exitMessage:"Chiqish tekshiruv jarayonini tugatadi. Ishonchingiz komilmi?",continueButton:"Davom etish",exitButton:"Chiqish",ariaLabelModal:"Didit tekshiruvi",ariaLabelClose:"Tekshiruvni yopish"},vi:{exitTitle:"Thoát khỏi xác minh?",exitMessage:"Thoát sẽ kết thúc quá trình xác minh của bạn. Bạn có chắc không?",continueButton:"Tiếp tục",exitButton:"Thoát",ariaLabelModal:"Xác minh Didit",ariaLabelClose:"Đóng xác minh"},"zh-CN":{exitTitle:"退出验证？",exitMessage:"退出将结束您的验证流程。确定要退出吗？",continueButton:"继续",exitButton:"退出",ariaLabelModal:"Didit 验证",ariaLabelClose:"关闭验证"},"zh-TW":{exitTitle:"退出驗證？",exitMessage:"退出將結束您的驗證流程。確定要退出嗎？",continueButton:"繼續",exitButton:"退出",ariaLabelModal:"Didit 驗證",ariaLabelClose:"關閉驗證"},zh:{exitTitle:"退出验证？",exitMessage:"退出将结束您的验证流程。确定要退出吗？",continueButton:"继续",exitButton:"退出",ariaLabelModal:"Didit 验证",ariaLabelClose:"关闭验证"}};function B(r){return z[r]??w}class j{constructor(e,i){this.state={isOpen:!1,isLoading:!0,showConfirmation:!1},this.overlay=null,this.container=null,this.iframe=null,this.loadingEl=null,this.confirmOverlay=null,this.boundHandleMessage=null,this.boundHandleKeydown=null,this.embedded=!1,this.embeddedContainer=null,this.language="en",this.modalId=E(),this.config={zIndex:(e==null?void 0:e.zIndex)??c.zIndex,showCloseButton:(e==null?void 0:e.showCloseButton)??c.showCloseButton,showExitConfirmation:(e==null?void 0:e.showExitConfirmation)??c.showExitConfirmation},this.callbacks=i,this.containerElement=(e==null?void 0:e.containerElement)??document.body,this.embedded=(e==null?void 0:e.embedded)??!1,this.embedded&&(e!=null&&e.embeddedContainerId)&&(this.embeddedContainer=document.getElementById(e.embeddedContainerId))}injectStyles(){const e="didit-sdk-styles";if(document.getElementById(e))return;const i=document.createElement("style");i.id=e,i.textContent=`
      .${a.overlay} {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: ${this.config.zIndex};
        justify-content: center;
        align-items: center;
        padding: 1rem;
        opacity: 0;
        transition: opacity 0.2s ease-out;
      }

      .${a.overlay}.active {
        display: flex;
        opacity: 1;
      }

      .${a.container} {
        position: relative;
        width: 100%;
        max-width: 500px;
        max-height: 90dvh;
        border-radius: 16px;
        overflow: hidden;
        background: transparent;
      }

      .${a.overlay}.active .${a.container} {
        transform: scale(1);
      }

      .${a.iframe} {
        width: 100%;
        height: 700px;
        border: none;
        display: block;
      }

      .${a.closeButton} {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        z-index: 10;
        outline: none;
      }

      .${a.closeButton}:hover,
      .${a.closeButton}:focus {
        background: transparent;
        opacity: 0.5;
      }

      .${a.closeButton} svg {
        stroke: #666;
        stroke-width: 2;
        stroke-linecap: round;
      }

      .${a.loading} {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fafafa;
        z-index: 5;
      }

      .${a.loading}.hidden {
        display: none;
      }

      .${a.loading} svg {
        width: 4rem;
        height: 4rem;
        animation: didit-spin 1s linear infinite;
      }

      .${a.loading} circle {
        stroke: #e5e5e5;
        stroke-width: 2.5;
        fill: none;
      }

      .${a.loading} path {
        stroke: #525252;
        stroke-width: 2.5;
        stroke-linecap: round;
        fill: none;
      }

      @keyframes didit-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .${a.confirmOverlay} {
        display: none;
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 20;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.15s ease-out;
      }

      .${a.confirmOverlay}.active {
        display: flex;
        opacity: 1;
      }

      .${a.confirmBox} {
        background: #fff;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        max-width: 300px;
        margin: 1rem;
        transform: scale(0.95);
        transition: transform 0.15s ease-out;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      .${a.confirmOverlay}.active .${a.confirmBox} {
        transform: scale(1);
      }

      .${a.confirmBox} h3 {
        color: #1a1a2e;
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .${a.confirmBox} p {
        color: #666;
        font-size: 0.875rem;
        margin: 0 0 1.25rem 0;
        line-height: 1.5;
      }

      .didit-confirm-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      }

      .didit-confirm-actions button {
        background: #2563eb;
        color: #fff;
        border: none;
        padding: 0.625rem 1.25rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .didit-confirm-actions button:hover {
        background: #1d4ed8;
      }

      .didit-confirm-actions span {
        color: #666;
        font-size: 0.875rem;
        cursor: pointer;
        padding: 0.625rem;
        transition: color 0.15s ease;
      }

      .didit-confirm-actions span:hover {
        color: #1a1a2e;
      }

      @media (max-width: 540px) {
        .${a.overlay} {
          padding: 0;
        }

        .${a.container} {
          max-width: 100%;
          max-height: 100dvh;
          border-radius: 0;
        }

        .${a.iframe} {
          height: 100dvh;
        }
      }

      .${a.embedded} {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .${a.embedded} .${a.iframe} {
        width: 100%;
        height: 100%;
      }

      .${a.embedded} .${a.loading} {
        border-radius: 0;
      }
    `,document.head.appendChild(i)}createDOM(){var i,n;if(this.injectStyles(),this.embedded&&this.embeddedContainer){this.createEmbeddedDOM();return}const e=B(this.language);if(this.overlay=document.createElement("div"),this.overlay.id=this.modalId,this.overlay.className=a.overlay,this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label",e.ariaLabelModal),this.container=document.createElement("div"),this.container.className=a.container,this.loadingEl=document.createElement("div"),this.loadingEl.className=a.loading,this.loadingEl.innerHTML=`
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    `,this.config.showCloseButton){const t=document.createElement("button");t.className=a.closeButton,t.setAttribute("aria-label",e.ariaLabelClose),t.innerHTML=`
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line x1="1" y1="1" x2="13" y2="13" />
          <line x1="13" y1="1" x2="1" y2="13" />
        </svg>
      `,t.addEventListener("click",()=>this.handleCloseRequest()),this.container.appendChild(t)}this.iframe=document.createElement("iframe"),this.iframe.className=a.iframe,this.iframe.setAttribute("allow","camera; microphone; fullscreen; autoplay; encrypted-media; geolocation"),this.iframe.setAttribute("title",e.ariaLabelModal),this.iframe.addEventListener("load",()=>this.handleIframeLoad()),this.confirmOverlay=document.createElement("div"),this.confirmOverlay.className=a.confirmOverlay,this.confirmOverlay.innerHTML=`
      <div class="${a.confirmBox}">
        <h3>${e.exitTitle}</h3>
        <p>${e.exitMessage}</p>
        <div class="didit-confirm-actions">
          <button type="button" data-action="continue">${e.continueButton}</button>
          <span data-action="exit">${e.exitButton}</span>
        </div>
      </div>
    `,(i=this.confirmOverlay.querySelector('[data-action="continue"]'))==null||i.addEventListener("click",()=>{this.hideConfirmation()}),(n=this.confirmOverlay.querySelector('[data-action="exit"]'))==null||n.addEventListener("click",()=>{this.confirmExit()}),this.container.appendChild(this.loadingEl),this.container.appendChild(this.iframe),this.container.appendChild(this.confirmOverlay),this.overlay.appendChild(this.container),this.overlay.addEventListener("click",t=>{t.target===this.overlay&&this.handleCloseRequest()}),this.containerElement.appendChild(this.overlay)}createEmbeddedDOM(){this.embeddedContainer&&(this.container=document.createElement("div"),this.container.id=this.modalId,this.container.className=a.embedded,this.loadingEl=document.createElement("div"),this.loadingEl.className=a.loading,this.loadingEl.innerHTML=`
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    `,this.iframe=document.createElement("iframe"),this.iframe.className=a.iframe,this.iframe.setAttribute("allow","camera; microphone; fullscreen; autoplay; encrypted-media; geolocation"),this.iframe.setAttribute("title",B(this.language).ariaLabelModal),this.iframe.addEventListener("load",()=>this.handleIframeLoad()),this.container.appendChild(this.loadingEl),this.container.appendChild(this.iframe),this.embeddedContainer.appendChild(this.container))}setupEventListeners(){this.boundHandleMessage=this.handleMessage.bind(this),window.addEventListener("message",this.boundHandleMessage),this.boundHandleKeydown=this.handleKeydown.bind(this),document.addEventListener("keydown",this.boundHandleKeydown)}removeEventListeners(){this.boundHandleMessage&&(window.removeEventListener("message",this.boundHandleMessage),this.boundHandleMessage=null),this.boundHandleKeydown&&(document.removeEventListener("keydown",this.boundHandleKeydown),this.boundHandleKeydown=null)}handleMessage(e){if(!T(e.origin))return;s.log("Received postMessage:",e.data);let i;try{typeof e.data=="string"?i=JSON.parse(e.data):i=e.data}catch{s.warn("Failed to parse postMessage:",e.data);return}if(i.type==="didit:close_request"){this.handleCloseRequest();return}this.callbacks.onMessage(i)}handleKeydown(e){this.state.isOpen&&e.key==="Escape"&&(e.preventDefault(),this.state.showConfirmation?this.hideConfirmation():this.handleCloseRequest())}handleIframeLoad(){var e,i;(e=this.iframe)!=null&&e.src&&this.iframe.src!=="about:blank"&&(this.state.isLoading=!1,(i=this.loadingEl)==null||i.classList.add("hidden"),this.callbacks.onIframeLoad())}handleCloseRequest(){this.config.showExitConfirmation?this.showConfirmation():this.callbacks.onCloseConfirmed()}showConfirmation(){var e;this.state.showConfirmation=!0,(e=this.confirmOverlay)==null||e.classList.add("active"),this.callbacks.onClose()}hideConfirmation(){var e;this.state.showConfirmation=!1,(e=this.confirmOverlay)==null||e.classList.remove("active")}confirmExit(){this.hideConfirmation(),this.callbacks.onCloseConfirmed()}open(e){var i,n,t;this.language=D(e),!this.overlay&&!this.container&&(this.createDOM(),this.setupEventListeners()),s.log("Opening with URL:",e),this.state.isLoading=!0,this.state.showConfirmation=!1,(i=this.loadingEl)==null||i.classList.remove("hidden"),(n=this.confirmOverlay)==null||n.classList.remove("active"),this.iframe&&(this.iframe.src=e),this.state.isOpen=!0,!this.embedded&&((t=this.overlay)==null||t.classList.add("active"),document.body.style.overflow="hidden")}close(){var e;s.log("Closing"),this.state.isOpen=!1,this.state.isLoading=!0,this.state.showConfirmation=!1,this.iframe&&(this.iframe.src="about:blank"),!this.embedded&&((e=this.overlay)==null||e.classList.remove("active"),document.body.style.overflow="")}destroy(){s.log("Destroying"),this.close(),this.removeEventListeners(),this.embedded&&this.container&&this.container.parentNode?this.container.parentNode.removeChild(this.container):this.overlay&&this.overlay.parentNode&&this.overlay.parentNode.removeChild(this.overlay),this.overlay=null,this.container=null,this.iframe=null,this.loadingEl=null,this.confirmOverlay=null}isOpen(){return this.state.isOpen}isLoading(){return this.state.isLoading}}class l{static get shared(){return l._instance||(l._instance=new l),l._instance}static reset(){l._instance&&(l._instance.destroy(),l._instance=null)}get state(){return this._state}get configuration(){return this._configuration}get isPresented(){var e;return((e=this._modal)==null?void 0:e.isOpen())??!1}get errorMessage(){return this._errorMessage}constructor(){this._state="idle",this._modal=null,s.log("DiditSdk initialized")}async startVerification(e){var n;const i=e.configuration;this._configuration=i,s.isEnabled=(i==null?void 0:i.loggingEnabled)??c.loggingEnabled,s.log("Starting verification with options:",e),this._modal&&(this._modal.destroy(),this._modal=null),this._modal=new j(i,{onClose:()=>this.handleModalClose(),onCloseConfirmed:()=>this.handleModalCloseConfirmed(),onMessage:t=>this.handleVerificationEvent(t),onIframeLoad:()=>this.handleIframeLoad()});try{const{url:t}=e;if(!t||typeof t!="string")throw new Error("Invalid options: url is required");this._url=t,this.setState("loading"),this.emitInternalEvent("didit:started",{}),(n=this._modal)==null||n.open(this._url)}catch(t){this.handleError(t)}}close(){s.log("Closing verification programmatically"),this.handleModalCloseConfirmed()}destroy(){var e;s.log("Destroying SDK instance"),(e=this._modal)==null||e.destroy(),this._modal=null,this.reset()}handleModalClose(){s.log("Modal close requested")}handleModalCloseConfirmed(){var n,t;s.log("Modal close confirmed");const e=this.buildSessionData();(n=this._modal)==null||n.close(),this.reset();const i={type:"cancelled",session:e};(t=this.onComplete)==null||t.call(this,i)}handleIframeLoad(){s.log("Iframe loaded")}emitInternalEvent(e,i){var t;const n={type:e,data:i,timestamp:Date.now()};s.log("Emitting internal event:",n),(t=this.onEvent)==null||t.call(this,n)}handleVerificationEvent(e){var i,n,t,o,d,h,m,f,g,b,p,x,v,L,y,k,C;switch(s.log("Verification event:",e),(i=this.onEvent)==null||i.call(this,e),e.type){case"didit:ready":s.log("Verification iframe ready");break;case"didit:started":s.log("User started verification");break;case"didit:step_started":s.log("Step started:",(n=e.data)==null?void 0:n.step);break;case"didit:step_completed":s.log("Step completed:",(t=e.data)==null?void 0:t.step,"-> next:",(o=e.data)==null?void 0:o.nextStep);break;case"didit:media_started":s.log("Media started:",(d=e.data)==null?void 0:d.mediaType,"for step:",(h=e.data)==null?void 0:h.step);break;case"didit:media_captured":s.log("Media captured for step:",(m=e.data)==null?void 0:m.step,"isAuto:",(f=e.data)==null?void 0:f.isAuto);break;case"didit:document_selected":s.log("Document selected:",(g=e.data)==null?void 0:g.documentType,"country:",(b=e.data)==null?void 0:b.country);break;case"didit:verification_submitted":s.log("Verification submitted for step:",(p=e.data)==null?void 0:p.step);break;case"didit:code_sent":s.log("Code sent via:",(x=e.data)==null?void 0:x.channel,"codeSize:",(v=e.data)==null?void 0:v.codeSize);break;case"didit:code_verified":s.log("Code verified via:",(L=e.data)==null?void 0:L.channel);break;case"didit:status_updated":s.log("Status updated:",(y=e.data)==null?void 0:y.status,"step:",(k=e.data)==null?void 0:k.step);break;case"didit:completed":this.handleVerificationCompleted(e);break;case"didit:cancelled":this.handleVerificationCancelled(e);break;case"didit:error":this.handleVerificationError(e);break;case"didit:step_changed":s.log("Step changed:",(C=e.data)==null?void 0:C.step);break}}handleVerificationCompleted(e){var t,o,d;s.log("Verification completed:",e.data);const i=this.buildSessionData(e.data);(t=this._configuration)!=null&&t.closeModalOnComplete&&((o=this._modal)==null||o.close(),this.reset());const n={type:"completed",session:i};(d=this.onComplete)==null||d.call(this,n)}handleVerificationCancelled(e){var t,o;s.log("Verification cancelled:",e.data);const i=this.buildSessionData(e.data);(t=this._modal)==null||t.close(),this.reset();const n={type:"cancelled",session:i};(o=this.onComplete)==null||o.call(this,n)}handleVerificationError(e){s.log("Verification error:",e.data)}handleError(e){var t,o;s.error("SDK error:",e);let i;e instanceof Error?i=M("unknown",e.message):i=M("unknown","An unknown error occurred"),this._errorMessage=i.message,this.setState("error"),(t=this._modal)==null||t.close(),this.reset();const n={type:"failed",error:i};(o=this.onComplete)==null||o.call(this,n)}setState(e){var n;const i=this._state;this._state=e,i!==e&&(s.log("State changed:",i,"->",e),(n=this.onStateChange)==null||n.call(this,e,this._errorMessage))}reset(){this._state="idle",this._sessionId=void 0,this._url=void 0,this._errorMessage=void 0,this._configuration=void 0}buildSessionData(e){const i=(e==null?void 0:e.sessionId)||this._sessionId;if(i)return{sessionId:i,status:(e==null?void 0:e.status)||"Pending"}}}l._instance=null;export{l as DiditSdk,l as default};
//# sourceMappingURL=didit-sdk.esm-D5Sol1U1.js.map
