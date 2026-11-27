/**
 * Terms of Use and Privacy Notice in English.
 *
 * Translation of `documentosLegais.ts`, which is the binding text. Keep the same sections and
 * paragraphs, in the same order: `documentosLegais.test.ts` compares them.
 */
import type { DocumentoLegal } from "./documentosLegais";

export const documentosEmIngles = (versao: string): Record<DocumentoLegal["chave"], DocumentoLegal> => ({
  termos: {
    chave: "termos",
    titulo: "Terms of Use",
    resumo: `The rules for using the ACESSO platform. Version ${versao}.`,
    secoes: [
      {
        titulo: "1. What ACESSO is",
        paragrafos: [
          "ACESSO is a professional network focused on inclusion in the job market, made for people with disabilities, professionals aged 50 or over and companies that practise inclusive hiring.",
          "The platform connects candidates and companies: it lets you build a professional profile, post and search for jobs, apply, exchange messages and publish content in the community.",
          "ACESSO is not an employment agency and takes no part in the working relationship between those who hire and those who are hired. The decision to hire, and everything that follows from it, belongs to the company.",
          "Using the platform is free for candidates and for companies.",
        ],
      },
      {
        titulo: "2. Who can create an account",
        paragrafos: [
          "To create an account you must be 16 or older and provide true information about yourself.",
          "Candidate account: created by an individual, for themselves. Each person must have a single account.",
          "Company account: created from an existing candidate account, by someone authorised to represent the company. The two accounts are linked, but remain separate, each with its own access.",
          "The company account is reviewed by the ACESSO team before it can post jobs. The review checks that the company exists and that the registration is consistent; it may be refused, and the reason is given.",
          "You are responsible for keeping your password secret and for everything that happens in your account. If you suspect unauthorised access, change your password and end the other sessions in Settings.",
        ],
      },
      {
        titulo: "3. What you can do",
        paragrafos: [
          "Candidate: build and edit a professional profile, upload a résumé, declare a disability, apply for jobs, follow people and companies, exchange messages, publish in the community and adjust accessibility preferences.",
          "Company: keep an institutional profile, post and manage jobs, view and answer applications, exchange messages with candidates and publish in the community.",
          "You keep ownership of the content you publish. By publishing, you authorise ACESSO to display that content on the platform to those your privacy settings allow — nothing beyond that.",
        ],
      },
      {
        titulo: "4. What is not allowed",
        paragrafos: [
          "Posting a job with a discriminatory requirement, or using the platform to discriminate on grounds of disability, age, race, colour, ethnicity, sex, sexual orientation, gender identity, religion, origin or social condition.",
          "Pretending to be another person or company, using third parties' data, or creating a company account without authorisation to represent it.",
          "Posting a job that does not exist, charging candidates any amount, or asking for bank details, payment documents or passwords through the platform.",
          "Harassing, threatening, defaming or pestering others; publishing illegal, violent or sexual content.",
          "Collecting other people's data by automated means, trying to get around the platform's access controls, or attacking the availability of the service.",
          "Using résumés or contact details obtained here for any purpose other than a selection process.",
        ],
      },
      {
        titulo: "5. Moderation",
        paragrafos: [
          "Anyone can report content or an account through the platform itself. Reports are reviewed by the ACESSO team.",
          "Content that breaks these Terms may be removed. Accounts may be blocked, and companies may be suspended or have their registration rejected. In those cases the reason is recorded and communicated to whoever was affected.",
          "The decision can be contested through the contact channel in item 9.",
        ],
      },
      {
        titulo: "6. Closing your account",
        paragrafos: [
          "You can pause your account at any time: it stops being shown to other people and is reactivated when you sign in again and confirm.",
          "You can also delete your account permanently. Deletion erases your profile, résumé, applications, posts, messages and preferences. It cannot be undone.",
          "The following may be kept for as long as necessary: records the law requires to be kept, and data strictly necessary for defence in legal proceedings. Details are in the Privacy Notice.",
        ],
      },
      {
        titulo: "7. Availability and limits of liability",
        paragrafos: [
          "ACESSO is offered as is. The platform may be unavailable for maintenance, because of a technical failure or because the infrastructure services it depends on are unavailable.",
          "ACESSO does not guarantee that an application will result in a hire, and is not answerable for the decisions, conduct or information of companies and candidates.",
          "Content published by users is the responsibility of whoever published it. ACESSO acts on that content when it is reported or when it becomes aware of it, as set out in item 5.",
          "The platform checks that the company exists when it registers, but this is no guarantee of its good standing or of the truth of each job. Be wary of requests for money or sensitive data and report them.",
        ],
      },
      {
        titulo: "8. Changes to these Terms",
        paragrafos: [
          "These Terms may change. Each version has an identifier, and ACESSO records which version you accepted and when.",
          "When there is a significant change, ACESSO will tell users before it takes effect.",
          "Continuing to use the platform after the notice means agreeing to the new version.",
        ],
      },
      {
        titulo: "9. Contact and jurisdiction",
        paragrafos: [
          "Questions, reports and requests about these Terms: through the Contact us form, in the ACESSO footer, or by e-mail at projetoacessoinclusivo@gmail.com.",
          "These Terms are governed by Brazilian law. The courts of the user's place of residence have jurisdiction to settle disputes, under the Brazilian Consumer Protection Code.",
        ],
      },
    ],
  },
  privacidade: {
    chave: "privacidade",
    titulo: "Privacy Notice",
    resumo: `How ACESSO handles your personal data. Version ${versao}.`,
    secoes: [
      {
        titulo: "1. Who handles your data",
        paragrafos: [
          "ACESSO is the controller of the personal data processed on the platform, under the Brazilian General Data Protection Law (LGPD, Law 13.709/2018).",
          "Contact for privacy matters, including exercising your rights: through the Contact us form (choose the subject \"Privacy and personal data (LGPD)\") or by e-mail at projetoacessoinclusivo@gmail.com.",
        ],
      },
      {
        titulo: "2. What data is collected",
        paragrafos: [
          "When you create the account: full name, e-mail, phone, CPF (Brazilian taxpayer number), country, date of birth, city and state, plus the password, which is stored only as a hash and never as text.",
          "In the professional profile, if you choose to fill it in: professional headline, education, summary, experience, degrees, skills, certificates, LinkedIn, GitHub, availability, salary expectation, photo and cover image.",
          "Résumé: the file you upload, when you upload it. It is optional.",
          "Disability declaration and accessibility needs, if you choose to declare them. These are sensitive data and are handled as described in item 4.",
          "Adjustments profile and communication preferences (My Accessibility) and application drafts, if you use these features. They are private and treated as sensitive data, as described in item 4.",
          "Use of the platform: applications, saved jobs, posts, comments, likes, shares, messages, people and companies you follow, blocks and reports you make.",
          "Accessibility and notification preferences, so the platform opens the way you set it up.",
          "Security and operation: active sessions with device and IP address, audit records of sensitive actions, and your Google account identifier if you sign in with it — never your Google password.",
          "From companies: CNPJ (Brazilian company number), legal name, trade name, sector, size, address, website, institutional description, inclusive culture, logo and cover image, plus the data of the person responsible for the account.",
        ],
      },
      {
        titulo: "3. Why each item is requested, and on what legal basis",
        paragrafos: [
          "Performance of the contract (art. 7, V): name, e-mail, password, phone, location, professional profile, résumé, applications and messages. Without them the platform does not work.",
          "Compliance with a legal obligation and fraud prevention (art. 7, II and art. 11, II, 'g'): CPF and CNPJ, stored encrypted, to avoid duplicate accounts and confirm that the company exists.",
          "Consent (art. 7, I and art. 11, I): disability declaration, accessibility needs and date of birth when used for affirmative-action jobs. You choose to provide them, and can withdraw them at any time.",
          "Legitimate interest (art. 7, IX): account security, content moderation, audit records and improvement of the platform.",
        ],
      },
      {
        titulo: "4. Sensitive data: disability and accessibility",
        paragrafos: [
          "Declaring a disability is always optional. The platform works without that information.",
          "The declaration is used to match your profile with affirmative-action jobs and to adapt the experience to your needs. It is not used to score, rank or restrict your access to anything.",
          "The accessibility needs you write, the notes on each disability, your date of birth, your adjustments profile and your communication preferences are private: only you and the moderation team can see them. A company only receives accessibility information if you choose it and authorise it, application by application.",
          "The disability category you declare (for example, \"Visual impairment\") is private by default. It only appears on your public profile if you turn that option on in My Accessibility, and turning it on releases no other information. You can also choose to share it in a specific application, which is a separate choice. Companies cannot search candidates by disability.",
          "You can remove the declaration at any time in your profile, and it stops being considered immediately.",
          "Authorisation per application: when you apply, you see a preview of what the company will receive and choose, item by item, which accessibility information to share. Sending the application does not by itself authorise sharing anything. ACESSO keeps a copy only of what you authorised, for that company and that selection process, and records the date and purpose of the authorisation. Changing your profile later does not change what you have already authorised.",
          "Withdrawing the authorisation: you can withdraw it whenever you want. The company can no longer view the information and ACESSO erases the content of the copy, keeping only a minimal record (dates and number of items) as proof of the operation. It is not possible to erase it from the memory of someone who already saw, copied or downloaded the information before the withdrawal. So share only what is needed to take part in the process.",
        ],
      },
      {
        titulo: "5. What is public and what is private on your profile",
        paragrafos: [
          "Public, for anyone who can see your profile (you adjust this in Settings › Privacy and Security): name, profile photo, cover image, professional headline, summary, education, city, state, country, availability, LinkedIn and GitHub links, experience, degrees, skills, certificates (title, institution and link, without the file) and, only if you turn that option on, the disability category you declared.",
          "Private, visible only to you and the moderation team: e-mail, phone, CPF, date of birth, gender, address, postal code, salary expectation, accessibility needs, notes on disability, adjustments profile, communication preferences and the résumé file.",
          "When you apply, the job's company receives your public profile, your contact e-mail and your résumé while the application is active (it loses access if you cancel the application or if it is rejected). CPF, address, date of birth and other private information are not sent. A company with no application from you sees only the public part, and no private data appears in open listings.",
        ],
      },
      {
        titulo: "6. Who the data is shared with",
        paragrafos: [
          "Companies: when you apply for a job, that job's company receives your public profile, contact e-mail, résumé and, only if you authorise it, the accessibility information you choose. Without an application, a company sees only what your profile shows publicly.",
          "Other people: what you publish in the community and your public profile are visible to those your privacy settings allow. You control this in Settings › Privacy and Security.",
          "Infrastructure providers, which process data only to run the service: Supabase (database and file storage), Render (application server), Vercel (website hosting), Brevo (sending confirmation and password recovery e-mails) and Expo (delivery of push notifications). Some of these providers' servers are outside Brazil (the database, for example, is in Canada).",
          "Google: only if you choose to sign in with a Google account. ACESSO receives from Google the account identifier, e-mail and name, and sends it only what is needed for authentication.",
          "IBGE: the list of cities is looked up in the public service of IBGE (Brazil's statistics institute) to fill in your location. None of your data is sent in that lookup.",
          "Automatic image description: if you ask for an alternative text suggestion for an image, that image is sent to an external artificial intelligence service (OpenRouter) only to generate the suggestion. It is your action, never automatic, and no other data from your profile goes with the image.",
          "Voice dictation: if you use dictation, speech recognition is done by your browser's service. In browsers such as Chrome and Edge, the audio may be sent to the browser maker and an internet connection is required. ACESSO receives only the text, after you review and confirm it, and does not record audio.",
          "Authorities: by court order or legal request, to the extent required.",
          "ACESSO does not sell personal data and does not share it for advertising.",
        ],
      },
      {
        titulo: "7. How long the data is kept",
        paragrafos: [
          "While your account exists, your profile data is kept so the platform can work.",
          "Paused account: the data is kept and stops being shown to other people until you reactivate it.",
          "Application drafts: they are kept for up to 30 days without changes and then erased. The company never sees them.",
          "Accessibility information shared in an application: it is erased when you withdraw the authorisation or cancel the application. Only a minimal record of the operation remains, without the content.",
          "Deleted account: profile, résumé, applications, posts, messages and preferences are erased, and the résumé file is removed from storage.",
          "The following may be kept after deletion: audit records of sensitive actions and data needed to comply with a legal obligation or for defence in legal proceedings, for the applicable legal period.",
        ],
      },
      {
        titulo: "8. Security",
        paragrafos: [
          "Passwords are stored only as a hash, using an algorithm made for that. Nobody at ACESSO can read your password.",
          "CPF and CNPJ are stored encrypted, with a separate hash used only to detect duplicates.",
          "Résumés are kept in private storage and are accessible only through a temporary signed link, generated after checking who may see them. There is no public résumé link.",
          "Access uses an authenticated session, with automatic renewal and the option to end sessions on other devices.",
          "No system is immune to incidents. If a security incident with significant risk to you occurs, ACESSO will tell you and the Brazilian National Data Protection Authority, as the LGPD requires.",
        ],
      },
      {
        titulo: "9. Your rights",
        paragrafos: [
          "You can: confirm that we process your data and access it; correct incomplete or outdated data; ask for anonymisation, blocking or erasure of data that is unnecessary or processed unlawfully; ask for portability; find out who we share it with; withdraw consent; and object to processing based on legitimate interest.",
          "Much of this is on the platform itself: edit and erase data in your profile, adjust visibility in Settings › Privacy and Security, remove the disability declaration, and pause or delete your account in Settings › Account.",
          "For anything not on the platform, use the Contact us form (subject \"Privacy and personal data (LGPD)\") or write to projetoacessoinclusivo@gmail.com. We answer as soon as possible, within the legal deadline.",
          "You can also file a complaint with the Brazilian National Data Protection Authority (ANPD).",
        ],
      },
      {
        titulo: "10. Cookies and browser storage",
        paragrafos: [
          "ACESSO does not use advertising or tracking cookies, and does not share data with ad networks.",
          "The browser stores locally only what is needed to keep you signed in and to keep your accessibility preferences. Clearing the site data ends the session and restores the default preferences.",
        ],
      },
      {
        titulo: "11. Changes to this Notice",
        paragrafos: [
          "This Notice may change. Each version has an identifier, and ACESSO records which version you accepted and when.",
          "ACESSO will tell users about significant changes before they take effect.",
        ],
      },
    ],
  },
});
