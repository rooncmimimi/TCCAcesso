import type { Dicionario } from "../dicionario";

/**
 * English translation of the Terms of Use and the Privacy Policy. The Portuguese text
 * (`pt/legal.ts`) is the reference version; same sections, same items, same order.
 */
export const legal: Dicionario["legal"] = {
  ui: {
    notaReferencia:
      "This is a courtesy translation. The Portuguese version is the reference text: if there is any difference between the two, the Portuguese version prevails.",
    versao: (versao) => `Version ${versao}`,
    abrirNovaAba: "Open in a new tab",
    voltarCadastro: "Back to sign-up",
    voltarInicio: "Back to the home page",
    inicio: "Home",
    pendenteTitulo: "Document not yet published.",
    pendenteTexto: (titulo) =>
      `The official text of “${titulo}” is being drafted. What you read below is only the list of subjects it will cover — it is not a contract and has no legal value.`,
  },
  termos: {
    meta: { titulo: "Terms of Use — ACESSO", descricao: "The rules for using the ACESSO platform." },
    titulo: "Terms of Use",
    resumo: (versao) => `The rules for using the ACESSO platform. Version ${versao}.`,
    secoes: [
      {
        titulo: "1. What ACESSO is",
        paragrafos: [
          "ACESSO is a professional network focused on inclusion in the job market, built for people with disabilities, professionals aged 50 or older, and companies that practice inclusive hiring.",
          "The platform connects candidates and companies: it lets you build a professional profile, publish and search for jobs, apply, exchange messages and publish content in the community.",
          "ACESSO is not an employment agency and takes no part in the working relationship between those who hire and those who are hired. The decision to hire, and everything that follows from it, belongs to the company.",
          "Using the platform is free for candidates and for companies.",
        ],
      },
      {
        titulo: "2. Who can create an account",
        paragrafos: [
          "To create an account you must be 16 or older and provide truthful information about yourself.",
          "Candidate account: created by an individual, for themselves. Each person must have a single account.",
          "Company account: created from an existing candidate account, by someone authorized to represent the company. The two accounts are linked but remain separate, each with its own access.",
          "The company account is reviewed by the ACESSO team before it can publish jobs. The review checks that the company exists and that the registration is consistent; it may be refused, and the reason is given.",
          "You are responsible for keeping your password secret and for everything that happens in your account. If you suspect unauthorized access, change your password and end your other sessions in Settings.",
        ],
      },
      {
        titulo: "3. What you can do",
        paragrafos: [
          "Candidates: build and edit a professional profile, upload a résumé, declare a disability, apply for jobs, follow people and companies, exchange messages, publish in the community and adjust accessibility preferences.",
          "Companies: maintain an institutional profile, publish and manage jobs, view and answer applications, exchange messages with candidates and publish in the community.",
          "You keep ownership of the content you publish. By publishing, you authorize ACESSO to display that content on the platform to whoever your privacy settings allow — nothing beyond that.",
        ],
      },
      {
        titulo: "4. What is not allowed",
        paragrafos: [
          "Publishing a job with discriminatory requirements, or using the platform to discriminate on the basis of disability, age, race, color, ethnicity, sex, sexual orientation, gender identity, religion, origin or social condition.",
          "Pretending to be another person or company, using third parties' data, or creating a company account without authorization to represent it.",
          "Publishing a job that does not exist, charging candidates any amount, or asking for bank details, payment documents or passwords through the platform.",
          "Harassing, threatening, defaming or pestering other people; publishing illegal, violent or sexual content.",
          "Collecting other people's data by automated means, trying to bypass the platform's access controls, or attacking the availability of the service.",
          "Using résumés or contact details obtained here for any purpose other than a hiring process.",
        ],
      },
      {
        titulo: "5. Moderation",
        paragrafos: [
          "Anyone can report content or an account through the platform itself. Reports are reviewed by the ACESSO team.",
          "Content that violates these Terms may be removed. Accounts may be blocked, and companies may be suspended or have their registration rejected. In those cases the reason is recorded and communicated to those affected.",
          "The decision can be contested through the contact channel given in section 9.",
        ],
      },
      {
        titulo: "6. Closing your account",
        paragrafos: [
          "You can pause your account at any time: it stops appearing to other people and is reactivated when you sign in again and confirm.",
          "You can also delete your account permanently. Deletion erases your profile, résumé, applications, posts, messages and preferences. It is irreversible.",
          "The following may remain for as long as necessary: records that the law requires us to keep, and data strictly necessary for defense in legal proceedings. The details are in the Privacy Policy.",
        ],
      },
      {
        titulo: "7. Availability and limits of liability",
        paragrafos: [
          "ACESSO is provided as is. The platform may become unavailable for maintenance, because of a technical failure, or because the infrastructure services it depends on are unavailable.",
          "ACESSO does not guarantee that an application will result in a hire, and is not responsible for the decisions, conduct or information of companies and candidates.",
          "Content published by those who use the platform is the responsibility of whoever published it. ACESSO acts on that content when it is reported or when it becomes aware of it, as set out in section 5.",
          "The platform checks that a company exists in the registry, but that is no guarantee of the company's integrity or of the truthfulness of each job. Be wary of requests for money or sensitive data, and report them.",
        ],
      },
      {
        titulo: "8. Changes to these Terms",
        paragrafos: [
          "These Terms may change. Each version has an identifier, and ACESSO records which version you accepted when you created your account, and when.",
          "When there is a relevant change, ACESSO will notify you by the e-mail address on file or on the platform itself, stating the date on which the new version takes effect.",
          "Continuing to use the platform after that date means agreeing to the new version. If you do not agree, you can delete your account, as described in section 6.",
        ],
      },
      {
        titulo: "9. Contact and jurisdiction",
        paragrafos: [
          "Questions, reports and requests about these Terms: projetoacessoinclusivo@gmail.com.",
          "These Terms are governed by the laws of Brazil. The courts of the user's place of residence are chosen as the venue for resolving disputes, in accordance with the Brazilian Consumer Protection Code (Código de Defesa do Consumidor).",
        ],
      },
    ],
  },
  privacidade: {
    meta: { titulo: "Privacy Policy — ACESSO", descricao: "How ACESSO handles your personal data." },
    titulo: "Privacy Policy",
    resumo: (versao) => `How ACESSO handles your personal data. Version ${versao}.`,
    secoes: [
      {
        titulo: "1. Who handles your data",
        paragrafos: [
          "ACESSO is the controller of the personal data processed on the platform, under the Brazilian General Data Protection Law (Lei Geral de Proteção de Dados — Law No. 13,709/2018, “LGPD”).",
          "Contact for privacy matters, including exercising your rights: projetoacessoinclusivo@gmail.com.",
        ],
      },
      {
        titulo: "2. What data is collected",
        paragrafos: [
          "When you create the account: full name, e-mail, phone number, CPF (the Brazilian individual taxpayer number), date of birth, city and state, plus the password, which is stored only as a hash and never as text. Sign-up does not ask for the country: ACESSO records Brazil on every account.",
          "In the professional profile, if you want to fill it in: professional title, education, summary, work experience, studies, skills, certificates, LinkedIn, GitHub, availability, salary expectation, photo and cover.",
          "Résumé: the file you upload, when you upload it. It is optional.",
          "Declaration of disability and accessibility needs, if you wish to declare them. This is sensitive data and receives the treatment described in section 4.",
          "Use of the platform: applications, saved jobs, posts, comments, likes, shares, messages, people and companies you follow, blocks and reports you make.",
          "Accessibility and notification preferences, so the platform opens the way you configured it.",
          "Security and operation: active sessions with device and IP address, audit records of sensitive actions, and your Google account identifier if you sign in with it — never your Google password.",
          "From companies: CNPJ (the Brazilian company registration number), legal name, trade name, industry, size, address, website, institutional description, inclusive culture, logo and cover, plus the details of whoever is responsible for the account.",
        ],
      },
      {
        titulo: "3. Why each piece of data is requested, and on what legal basis",
        paragrafos: [
          "Performance of a contract (art. 7, V of the LGPD): name, e-mail, password, phone, date of birth, location, professional profile, résumé, applications and messages. Without them the platform does not work; that is why the account details and the personal details are mandatory at sign-up, and the résumé and photo are optional.",
          "Legitimate interest (art. 7, IX): CPF and CNPJ, stored encrypted, to prevent duplicate accounts and confirm that the company exists; and also account security, content moderation, audit records and improving the platform.",
          "Consent (art. 7, I and art. 11, I): the declaration of disability and any other sensitive information you choose to put in your profile. You choose whether to provide it, and you can withdraw it at any time.",
        ],
      },
      {
        titulo: "4. Sensitive data: disability and accessibility",
        paragrafos: [
          "Declaring a disability is always optional. The platform works without this information.",
          "The disability you declare is part of your profile: it appears in the disabilities section and is visible to whoever can see your profile, including companies. If you do not want it to appear, do not declare it, or remove the declaration.",
          "ACESSO does not use the declaration to score or rank applications.",
          "The platform's accessibility preferences (contrast, font size, voice reading, VLibras and the like) are a different matter: they stay in your account only so that the screen opens the way you configured it, and they are not shown on your profile.",
          "You can remove the declaration of disability at any time in your profile, and it stops appearing immediately.",
        ],
      },
      {
        titulo: "5. Who the data is shared with",
        paragrafos: [
          "Companies: when you apply for a job, that job's company receives your profile, your résumé and the data needed for the process. Without an application, a company sees only what your profile shows publicly.",
          "Other people: what you publish in the community and your public profile are visible to whoever your privacy settings allow. You control this in Settings › Privacy.",
          "Infrastructure providers, which process data only to operate the service: Supabase (database and file storage), Render (application server), Vercel (Site hosting), Brevo (sending confirmation and password-recovery e-mails) and Expo (delivery of push notifications).",
          "Google (signing in with your Google account): only if you choose that path. ACESSO receives from Google the account identifier, e-mail and name, and sends it only what is needed for authentication.",
          "Fonts and VLibras: when you open the Site, your browser fetches the fonts from Google Fonts and the dyslexia font from CDNFonts, and those services receive your IP address and technical browser data, as happens with any request over the internet. If you turn on VLibras in the accessibility preferences, your browser also loads the Federal Government's Libras translator (vlibras.gov.br), which then receives that same technical data.",
          "IBGE: the list of cities is fetched from the public IBGE service to fill in your location. No data of yours is sent in that request.",
          "Automatic image description: if you ask for an alternative-text suggestion for an image, that image is sent to an external artificial-intelligence service (OpenRouter) only to generate the suggestion. It is an action you take, never automatic, and no other data from your profile accompanies the image.",
          "Authorities: by court order or legal request, to the extent required.",
          "ACESSO does not sell personal data and does not share it for advertising.",
        ],
      },
      {
        titulo: "6. How long data is kept",
        paragrafos: [
          "While your account exists, your profile data is kept so the platform can work.",
          "Paused account: the data is kept and stops appearing to other people until you reactivate it.",
          "Deleted account: profile, résumé, applications, posts, messages and preferences are erased, and the résumé file is removed from storage.",
          "The following may be kept after deletion: audit records of sensitive actions, and data needed to comply with a legal obligation or for defense in legal proceedings, for the applicable legal period.",
        ],
      },
      {
        titulo: "7. Security",
        paragrafos: [
          "Passwords are stored only as a hash, using an algorithm designed for that. No one at ACESSO can read your password.",
          "CPF and CNPJ are stored encrypted, with a separate hash used only to detect duplicates.",
          "Résumés are kept in private storage and can only be reached through a temporary, signed link generated after checking who may see them. There is no public résumé link.",
          "Access is through an authenticated session, with automatic renewal and the ability to end sessions on other devices.",
          "No system is immune to incidents. If a security incident occurs that poses a relevant risk to you, ACESSO will notify you and the Brazilian National Data Protection Authority (ANPD), as the LGPD requires.",
        ],
      },
      {
        titulo: "8. Your rights",
        paragrafos: [
          "You may: confirm that we process your data and access it; correct incomplete or outdated data; request anonymization, blocking or deletion of unnecessary data or data processed unlawfully; request portability; find out who we share it with; withdraw consent; and object to processing carried out on the basis of legitimate interest.",
          "Much of this is on the platform itself: edit and delete data in your profile, adjust visibility in Settings › Privacy, remove the declaration of disability, and pause or delete the account in Settings › Account.",
          "For anything that is not on the platform, write to projetoacessoinclusivo@gmail.com. We reply as soon as possible, within the legal deadline.",
          "You may also file a complaint with the Brazilian National Data Protection Authority (ANPD).",
        ],
      },
      {
        titulo: "9. Cookies and browser storage",
        paragrafos: [
          "ACESSO does not use advertising or tracking cookies, and does not share data with ad networks.",
          "The browser stores locally only what is needed for you to stay signed in and to keep your accessibility preferences. Clearing the site's data ends the session and restores the default preferences.",
        ],
      },
      {
        titulo: "10. Changes to this Policy",
        paragrafos: [
          "This Policy may change. Each version has an identifier, and ACESSO records which version you accepted when you created your account, and when.",
          "Relevant changes are communicated by the e-mail address on file or on the platform, with the date on which they take effect.",
        ],
      },
    ],
  },
};
