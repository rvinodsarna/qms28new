const fs = require("fs");

// Format: category | question | answer | keyword1,keyword2,...
const rows = `
GETTING STARTED|How do I log in to QMS RISE?|Open the QMS RISE website. On the splash screen click "Skip Intro" or wait for it to finish, then click "Use email & password instead" if the face login does not appear. Enter your UNIMY email and password and click Login.|login,sign in,password,email,face login,splash,skip intro,access,enter,account,log,credential,authentication
GETTING STARTED|Can I log in with my face?|Yes. On the login screen, click "Use Face Login instead" and allow camera access. Position your face inside the circle and hold still. If it fails, click "Try Again" or fall back to email and password.|face,face login,face id,camera,biometric,facial recognition,scan face,face auth,login with face
GETTING STARTED|I forgot my password. What do I do?|Click "Forgot password?" on the login screen. Enter your registered email and follow the reset link sent to your inbox. If you do not receive it, contact your lecturer or the QMS admin.|forgot,reset,password,recover,recovery,forgot password,change password,lost password
GETTING STARTED|Why can't I log in?|Check that you are using your UNIMY email (not a personal one), your password is correct (case-sensitive), and your account is active. If you still cannot log in, contact your lecturer or the So-CSI admin office.|cannot login,login failed,access denied,wrong password,not working,locked out,error login,unable
GETTING STARTED|How do I log out safely?|Click your name or profile icon in the top-right corner, then click Logout. Always log out on shared devices. A logout video may play automatically.|logout,sign out,exit,log out,safe,logoff,leave,disconnect

DASHBOARD|What is on my student dashboard?|The dashboard shows your RISE Score, RISE Categories grid, Quick Actions tiles, recent activity, notifications, and shortcuts to attendance, quizzes, evaluations, timetable, and support tools.|dashboard,home,main page,overview,landing,my page,start page,front page,homepage
DASHBOARD|How do I customise my dashboard?|Drag any RISE Category card to reorder it. Drag a card onto the Quick Actions grid to pin it as a shortcut. Your order is saved automatically and follows you across devices.|customise,customize,reorder,arrange,move cards,drag,dashboard layout,pin,quick actions,personalise
DASHBOARD|What are Quick Actions?|Quick Actions are shortcut tiles at the bottom of your dashboard. You can pin up to 6 by dragging a RISE Category card onto the grid. Click the Edit button in the header to remove a pinned tile.|quick actions,quick access,shortcut,tiles,pin,unpin,remove tile,edit quick actions,pinned
DASHBOARD|How do I reset my dashboard layout?|Open the browser console and type resetDashboardOrder() and press Enter. The dashboard will reload with the default order.|reset,default layout,restore order,clear layout,undo drag

RISE POINTS|What are RISE Points?|RISE Points are points you earn for engagement: attendance, evaluations, quizzes, events, workshops, certifications, competitions, clubs, streak activity, community service, and research. They build your tier and unlock badges.|rise points,points,score,reward,earn points,rise score,total points,my points,engagement points
RISE POINTS|How do I earn RISE Points?|You earn points by scanning QR attendance, submitting evaluations, playing Quiz Battle, joining events and workshops, uploading Coursera certificates, participating in clubs, maintaining a streak, competing in competitions, doing community service, and contributing to research.|earn points,get points,how to get points,make points,earn rise,points from attendance
RISE POINTS|What are RISE Tiers?|Tiers are levels based on your total RISE Points. Higher tiers unlock badges and recognition. Check your tier on the dashboard card labelled RISE Score.|tier,tiers,level,rank,status,my tier,rise tier,tier system,ranking
RISE POINTS|Where can I see my RISE Points history?|Open My Progress or your Profile page. You will see a breakdown of every point-earning activity with the date, category, and points awarded.|points history,where points,points log,activity log,points record,how many points,my points history
RISE POINTS|What is a Streak?|A streak tracks consecutive days or weeks of engagement. Keep using QMS every day to build and maintain your streak for bonus points.|streak,consecutive days,daily streak,streak bonus,maintain streak,streak points
RISE POINTS|Do points expire?|Points do not expire within an active academic year. They are tied to your student account and carry forward with your programme.|expire,points expire,validity,do points last,points expiry

CATEGORIES|What are RISE Categories?|RISE Categories are the 12 areas of engagement the QMS tracks: Attendance, Evaluation, Quiz Battle, Bonus, Clubs & Roles, Streak, Workshops & Talks, Competitions, Coursera, Award & Recognition, Community Service, and Research & Publications.|categories,rise categories,12 categories,engagement areas,what categories,my categories
CATEGORIES|How do I see my progress in a category?|Click on a RISE Category card to open its detail page. It shows your current points, max cap, and recent activity.|category progress,category details,check category,how many points in category
CATEGORIES|What are category caps?|Each category has a maximum point cap per semester. Once you hit the cap, extra activity still counts for your record but does not add points.|cap,caps,maximum,limit,max points,category limit,points cap

BADGES|What are badges?|Badges are digital awards you unlock by hitting milestones: attendance streaks, high quiz scores, tier upgrades, club roles, event participation, and more.|badge,badges,awards,achievements,unlock badge,my badges,digital badge
BADGES|Where can I see my badges?|Open Awards & Recognition from the dashboard or navigate to your Profile. All earned badges appear with the date they were unlocked.|see badges,view badges,my badges list,badge collection,earned badges
BADGES|How do I earn a new badge?|Keep engaging: attend classes, play quizzes, submit evaluations, join events, earn certificates. Progress toward the next badge is shown on your Awards page.|earn badge,get badge,unlock,new badge,badge progress

ATTENDANCE|How do I check in to attendance using QR?|Go to QR Scanner from Quick Actions or the sidebar. Point your camera at the QR code shown by your lecturer and hold steady. The system detects the code, marks your attendance, and credits RISE Points.|qr,qr code,scan,scan qr,check in,checkin,attendance scan,mark attendance,camera,how to attend,attendance check in
ATTENDANCE|What if the QR camera does not work?|Click Start Camera again and allow camera access when prompted. If it still fails, type the session code manually in the input box and press "Mark Attendance".|camera not working,qr not working,cannot scan,no camera,manual code,type code,camera blocked,permission
ATTENDANCE|How fast do I need to scan the QR?|The QR regenerates every 15 seconds, so scan quickly. If you miss the window, wait for the next code to appear and scan again.|15 seconds,fast,quickly,code changes,timer,expiry,expires,regenerated,time limit
ATTENDANCE|Why does it say "Invalid or expired code"?|The code expired before you submitted, or you typed it wrong. Wait for the lecturer to display a new QR, then scan or type the new code immediately.|invalid,expired,code invalid,code expired,wrong code,not accepted
ATTENDANCE|Why does it say "Already checked in"?|You cannot check in twice for the same session. If you think this is a mistake, contact your lecturer so they can review the session log.|already checked in,duplicate,double scan,already marked,twice
ATTENDANCE|Where do I see my attendance record?|Open Attendance from the sidebar. You will see every session you attended with subject, type, location, date, and points earned.|see attendance,attendance record,attendance history,my attendance,view attendance,attendance log
ATTENDANCE|What is attendance bonus?|Attendance bonus is extra RISE Points awarded for consistent attendance or hitting attendance milestones.|attendance bonus,bonus points,extra points,attendance reward,attendance perk
ATTENDANCE|Does attendance affect my grade?|Attendance contributes to your RISE Score and engagement profile. It does not directly change a course grade but is visible to staff and factored into engagement reports.|attendance grade,affect grade,attendance marks,attendance count,towards grade
ATTENDANCE|What types of attendance sessions exist?|Session types include class, lab, workshop, event, and bonus. Each type carries a different point value.|session type,class,lab,workshop,event,types of attendance,attendance categories

QUIZ|What is Quiz Battle Arena?|Quiz Battle Arena is a live 1-on-1 quiz feature. You choose 5, 10, or 20 questions, the system matches you with another student from your programme, a 3-second countdown starts, and you both answer to score highest.|quiz,quiz battle,battle arena,quiz game,play quiz,1v1 quiz,match quiz,arena
QUIZ|How do I start a quiz?|Go to Quiz Battle Arena from the sidebar or dashboard. Choose your topic, choose 5/10/20 questions, click Find Opponent, and wait for the countdown.|start quiz,how to quiz,play quiz,battle,find opponent,start battle
QUIZ|How are quiz points calculated?|You earn RISE Points for correct answers and a bonus for winning the battle. Faster correct answers may earn extra points.|quiz points,quiz score,how many points,quiz reward
QUIZ|Can I see past quiz results?|Yes. Open Quiz Battle Arena and click History or Results. You will see every match, opponent, score, and points earned.|quiz history,quiz results,past quizzes,previous quizzes,match history
QUIZ|What topics are in the quiz?|Quiz topics follow your enrolled courses. Each course may have its own question set managed by your lecturer.|quiz topics,quiz subjects,what quiz topics,quiz questions source,quiz content
QUIZ|What if I disconnect during a quiz?|If you lose connection mid-quiz you may forfeit the match. Reconnect quickly and re-enter the arena. Forfeited matches do not count toward your score.|disconnect,disconnected,left quiz,internet,connection lost,quit quiz

EVALUATIONS|How do I submit an evaluation?|Open Evaluation from the sidebar. Select a lecturer, choose the week, rate each criterion from 1 to 10 using the sliders, then click Submit.|evaluation,submit evaluation,evaluate lecturer,rate lecturer,feedback,teacher feedback,eval form,how to evaluate
EVALUATIONS|How often can I submit evaluations?|You submit one evaluation per lecturer per week. Repeated submissions in the same week are blocked.|how often,how many times,repeat,weekly,one per week,limits
EVALUATIONS|Is my evaluation anonymous?|Your submission is stored but shown to staff in aggregated form. Staff cannot see your identity in individual responses.|anonymous,privacy,who sees,can lecturer see,identity,private,confidential
EVALUATIONS|What is the evaluation score based on?|You rate teaching quality, clarity, engagement, pacing, materials, and support on a 1-10 scale. The average appears in staff evaluation reports.|criterias,what to rate,score,rating criteria,how to rate,evaluation questions
EVALUATIONS|Can I change my evaluation after submitting?|No. Once submitted, evaluations are locked. If you submitted by mistake, contact your lecturer.|edit evaluation,change evaluation,update evaluation,modify evaluation

STUDY PLAN|What is Study Plan?|Study Plan shows your planned courses across semesters. It helps you see prerequisites, track progression, and plan your pathway.|study plan,planner,plan courses,course plan,progression plan,semester plan
STUDY PLAN|How do I build a study plan?|Open Study Plan from the sidebar. Drag courses from the available list into the semester buckets. The system checks prerequisites and credit-hour rules automatically.|build plan,create plan,make study plan,add courses to plan,study planner
STUDY PLAN|What are prerequisites?|Prerequisites are courses you must pass before you can take a higher course. The Study Plan flags any course whose prerequisites are not met.|prerequisite,pre req,requirement,before course,pre-requisite
STUDY PLAN|Can I move a course to a different semester?|Yes. Drag the course card to another semester bucket. The plan saves automatically.|move course,change semester,shift course,reschedule course
STUDY PLAN|Where do I see my timetable?|Open Timetable from the sidebar. It shows your weekly class schedule with subject, time, location, and lecturer.|timetable,schedule,my timetable,class schedule,weekly schedule,classes
STUDY PLAN|Can I export my timetable?|Use your browser's print option (Ctrl+P) to save the timetable as PDF. Spreadsheet export is available if enabled by your school.|export timetable,download timetable,print timetable,save timetable,pdf timetable

ENROLMENT|What is Enrolment Request?|Enrolment Request lets you formally request to register for a subject. It replaces informal email requests and tracks the approval workflow.|enrolment,enrollment,register subject,add subject,subject registration,enrol request
ENROLMENT|How do I submit an enrolment request?|Open Enrolment Requests, click New Request, choose the subject and semester, add a reason if required, and submit. You will see the status change as it moves through approval.|submit enrolment,how to enrol,enrol subject,new enrolment,request subject
ENROLMENT|What does an exception request mean?|If you do not meet prerequisites, you can request an exception with a written reason. Your HOP will review it.|exception,exception request,waiver,special request,prereq not met

CREDIT TRANSFER|What is Credit Transfer?|Credit Transfer lets you apply to have courses from another institution counted toward your UNIMY programme.|credit transfer,transfer credit,recognition of prior learning,rpl,transfer courses
CREDIT TRANSFER|How do I apply for Credit Transfer?|Open Credit Transfers, click New Application, upload your transcript and course syllabus, list the courses you want transferred, and submit.|apply transfer,how to transfer,submit credit transfer,transfer application,transfer request
CREDIT TRANSFER|How long does review take?|Review is handled by your HOP and Dean. You can track the status in the Credit Transfer page. Most decisions are returned within two weeks.|how long,review time,approval time,wait,processing time
CREDIT TRANSFER|Who decides my credit transfer?|Your HOP reviews the course matching, and the Dean approves the final decision. You will see comments in the Credit Transfer page.|who approves,who decides,approval,dean,hop,reviewer

EVENTS|How do I see events?|Open Events from the sidebar. Upcoming events are listed with date, time, venue, points offered, and seats remaining.|events,upcoming events,what events,event list,calendar,activities
EVENTS|How do I book an event?|Click Book on the event card. Your booking is confirmed instantly if seats are available. You will receive a confirmation and any points after attendance is marked.|book event,register event,join event,event booking,sign up event
EVENTS|Can I cancel an event booking?|Yes. Open Events, find the booked event, and click Cancel. Cancellations after the deadline may affect points.|cancel booking,cancel event,unregister event,remove booking
EVENTS|Do events give RISE Points?|Most events, workshops, talks, and competitions carry RISE Points. The exact amount is shown on the event card.|event points,how many points,event reward,points for events

CLUBS|What are Clubs & Roles?|Clubs are student organisations. Roles are positions inside a club (President, Secretary, etc.) that carry additional points and recognition.|clubs,club,student clubs,roles,positions,my club,membership,join club
CLUBS|How do I join a club?|Open Clubs & Roles, browse active clubs, click Join, and wait for approval from the club leader or Dean.|join club,how to join club,club membership,apply club
CLUBS|Do clubs have their own events?|Yes. Many clubs run events, competitions, and workshops. Club event attendance also counts toward your RISE Points.|club events,club activities,club competition

AWARDS|What is Award & Recognition?|Awards and Recognition highlight outstanding student achievement across academics, engagement, and service. Your dashboard shows any awards you have received.|award,awards,recognition,award recognition,my awards,student award
AWARDS|How do I get nominated for an award?|Nominations come from staff based on engagement, RISE Points, and academic record. There is no self-nomination.|nomination,nominated,how to get award,get nominated,choose award
AWARDS|What is a Certificate in QMS?|Certificates are formal records you can submit as evidence of external learning (Coursera, edX, professional bodies). Once approved, they appear on your profile.|certificate,certificates,my certificates,submit certificate,upload certificate,external certificate,coursera certificate

COURSERA|How do I submit a Coursera certificate?|Open Coursera from the sidebar, upload a PDF or image of your certificate, select the linked course, and submit. Reviewers approve it and points are credited.|coursera,submit coursera,upload coursera,coursera certificate,external course
COURSERA|How many Coursera points can I earn?|The Coursera category has a semester cap. Each approved certificate adds a fixed amount until you reach the cap.|coursera points,how many coursera,coursera cap

MESSAGES|How do I send a message?|Open Messages from the sidebar, choose a recipient from your contacts, type your message, and press Send. Messages are stored in your conversation history.|message,send message,dm,direct message,chat with staff,message staff
MESSAGES|Who can I message?|You can message your lecturers, HOP, and other students who have accepted your chat request. You cannot message users who have blocked you.|who can message,message lecturer,message teacher,message other students
MESSAGES|Do I get notifications for new messages?|Yes. A badge shows unread messages in the sidebar. You can manage notification preferences in your Profile page.|notification,unread,alert,new message,message notification,badge

PEER CHAT|What is Peer Chat?|Peer Chat lets you connect with other students. You send a request, they accept, and then you can chat freely. You can block anyone at any time.|peer chat,student chat,chat with students,peer,connect student,classmate chat
PEER CHAT|How do I send a peer chat request?|Open Peer Chat, search for a student by name or ID, click Send Request. They will receive a notification and can accept or reject.|chat request,add friend,connect,peer request,request chat
PEER CHAT|How do I block someone?|Open the conversation, click the menu (three dots), and select Block. Blocked users cannot message you or send new requests.|block,block user,stop messaging,unblock,block someone
PEER CHAT|What does the online dot mean?|The green dot next to a name means the student is currently online in QMS. Grey means offline.|online,offline,presence,green dot,status,active now

COMPLAINTS|How do I file a complaint?|Open Complaints from the sidebar, click New Complaint, choose a category, describe the issue, and submit. You can choose to file anonymously.|complaint,file complaint,submit complaint,report issue,feedback problem,raise complaint
COMPLAINTS|Who sees my complaint?|Only authorised staff (Dean, HOP, and assigned reviewers) see complaints. Other students never see your complaint.|who sees,confidential complaint,privacy,staff only,visible to
COMPLAINTS|Can I file anonymously?|Yes. Toggle the Anonymous option when submitting. Your identity is hidden from reviewers but recorded for audit purposes only.|anonymous,anonymous complaint,hide identity,no name

SUPPORT|What is Academic Support?|Academic Support is where you request help with studies, ask for tutoring, flag difficulty in a subject, or ask for a meeting with a lecturer.|academic support,support,help,request help,tutoring,study help,ask lecturer
SUPPORT|How do I request academic support?|Open Academic Support, describe your issue, choose the subject, and submit. Your lecturer or HOP will respond.|request support,ask for help,submit support,how to get help

DOCUMENTS|How do I upload a document?|Open Documents from the sidebar, click Upload, choose your file (PDF, image, or Office document), and attach it to the correct folder.|upload document,submit document,file upload,attach file,add document
DOCUMENTS|What file types are allowed?|PDF, PNG, JPG, DOCX, and DOC are supported. Maximum size is typically 10 MB per file. Ask your lecturer if a different format is required.|file type,allowed format,pdf,docx,png,jpg,max size
DOCUMENTS|Who can see my uploads?|Only you and the staff you share them with. Documents are protected by role-based access.|who sees uploads,privacy,share document,visibility

AI ASSISTANT|What is the AI Assistant?|The AI Assistant is the floating chat button at the bottom-right of the screen. It answers questions about QMS using the QMS knowledge base and can help with common tasks.|ai,ai assistant,chatbot,assistant,help bot,qms assistant,ai chat,robot
AI ASSISTANT|How do I open the AI Assistant?|Click the round robot button at the bottom-right, or press Ctrl+K on desktop. The chat panel opens with suggested questions.|open ai,how to open chat,start chat,robot button,ctrl+k
AI ASSISTANT|Does the AI Assistant know everything?|It answers from the QMS FAQ knowledge base and can supplement with general AI. For academic decisions always confirm with your lecturer or HOP.|ai know,accurate,reliable,correct answers,ai help

PROFILE|How do I edit my profile?|Click your avatar in the top-right, choose Profile, and update your photo, contact details, and preferences. Some fields (name, student ID) cannot be changed.|profile,edit profile,change profile,my profile,update profile
PROFILE|How do I change my avatar?|Open Profile, click the avatar image, choose from the avatar catalog, and save. You can also upload your own photo.|avatar,profile photo,picture,change picture,my avatar
PROFILE|How do I change my password?|Open Profile, scroll to Security, click Change Password, enter your current password and the new one twice.|password,change password,new password,update password,reset password
PROFILE|How do I manage notification preferences?|Open Profile, scroll to Notifications, and toggle which alerts you want by email, in-app, or both.|notification preferences,notifications,email alerts,toggle alerts

MOBILE|Does QMS work on my phone?|Yes. QMS is fully responsive. The dashboard, attendance, quizzes, and chat all work on mobile browsers. Some features like QR scanning require camera permission.|mobile,phone,smartphone,iphone,android,tablet,responsive
MOBILE|Why is the layout broken on my phone?|Try rotating your device, or clear the browser cache and reload. If a specific page is broken, report it with a screenshot.|broken layout,mobile issue,layout problem,looks weird,not fitting
MOBILE|Do I need to install an app?|No. QMS RISE runs entirely in the browser. Just bookmark it on your home screen for one-tap access.|app,install,download,apk,ios app,play store

SECURITY|How is my data protected?|QMS uses role-based access and Row Level Security at the database level. Only you and authorised staff can see your records. All traffic uses HTTPS.|security,data protection,privacy,secure,safe,protected,encrypted
SECURITY|Can staff see my face login data?|Face credentials are stored separately and only used to verify your identity. Staff cannot view your face data.|face data,biometric,privacy face,face privacy,face storage
SECURITY|What should I do if I suspect unauthorised access?|Change your password immediately, then contact your lecturer or the So-CSI admin. You can also check active sessions in Profile → Security.|unauthorised,unauthorized,hacked,compromised,suspicious,unknown login

MISC|What is CLO Attainment?|Course Learning Outcome (CLO) Attainment measures how well students achieve the intended learning outcomes of a course. It is a staff-reviewed record and not shown to students on their dashboard.|clo,clo attainment,course learning outcome,learning outcome,attainment
MISC|What is CQI?|Continuous Quality Improvement (CQI) is how staff record and act on quality issues. Students benefit indirectly by improvements to courses and teaching. Students do not see CQI records.|cqi,continuous quality improvement,quality improvement,quality
MISC|What is the QS1 paper?|QS1 papers are quality-system assessment records used by staff for review and accreditation. They are not visible to students.|qs1,qs1 paper,quality paper
MISC|How do I find something quickly?|Use the AI Assistant (Ctrl+K) or the FAQ search. You can type any keyword — attendance, quiz, points, evaluation, certificate — and it will find matching help.|find help,search help,how to find,quick help,look up,faq,help search
MISC|Who do I contact for QMS issues?|Contact your lecturer first. If it is a system problem, contact the So-CSI admin office or Dean's office. For urgent issues, use the Complaints page.|contact,support,who to contact,report bug,help desk,admin
`.trim();

const lines = rows.split("\n").filter(l => l.trim() && !l.startsWith("#"));

const out = lines.map((line, idx) => {
  const [category, question, answer, keywords] = line.split("|");
  return {
    id: "s" + (idx + 1),
    category: (category || "").trim(),
    question: (question || "").trim(),
    answer: (answer || "").trim(),
    keywords: (keywords || "").split(",").map(k => k.trim()).filter(Boolean)
  };
});

fs.writeFileSync("faqs-students.json", JSON.stringify(out, null, 2), "utf8");
console.log("Wrote " + out.length + " student FAQs to faqs-students.json");
console.log("Size:", fs.statSync("faqs-students.json").size, "bytes");
