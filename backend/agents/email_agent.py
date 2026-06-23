import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from backend.schemas.interview_state import InterviewState

class EmailResponseSchema(BaseModel):
    subject: str = Field(description="The email subject line")
    body: str = Field(description="The email body HTML content (excluding any outer html/body tags, just the inner HTML elements with beautiful styling)")

class EmailAgent:
    """
    Agent responsible for generating and sending/saving results emails to candidates.
    """
    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        # In the review-based flow, emails are not sent automatically during graph execution.
        # This method is kept as a pass-through to ensure graph compatibility.
        return state

    @staticmethod
    def send_results_email(db, candidate_id: str) -> bool:
        """
        Loads candidate details and generates/dispatches the evaluation email.
        """
        from backend.database.repository import InterviewRepository
        profile = InterviewRepository.get_candidate_profile(db, candidate_id)
        if not profile:
            print(f"Candidate profile {candidate_id} not found in database.")
            return False

        candidate_name = profile.candidate_name
        first_name = candidate_name.split()[0] if candidate_name else "Candidate"
        email_address = profile.email
        recommendation = profile.recommendation
        overall_score = profile.overall_score
        final_evaluation = profile.final_evaluation or ""
        cleaned_feedback = EmailAgent._clean_feedback_for_email(final_evaluation)

        if not email_address:
            print(f"Skipping email sending: No email address found for candidate {candidate_name}")
            return False

        # Prompt for Gemini to draft a professional, warm email
        prompt = f"""You are the Admissions Coordinator for the Agentic AI Bootcamp.
Draft a highly professional, encouraging, and clear email to the candidate regarding their final interview results.

Candidate Details:
Name: {candidate_name} (First Name: {first_name})
Email: {email_address}
Overall Score: {overall_score}/5.0
Final Decision Status: {recommendation}
Admissions Evaluation Summary & Feedback:
{cleaned_feedback}

Instructions:
1. Write a beautifully structured email. Address the candidate warmly using only their first name (e.g. "Dear {first_name},").
2. The email subject must be: "Agentic AI Bootcamp Results - Admissions Update" or similar.
3. The email tone must be very positive and encouraging.
4. Incorporate key constructive feedback, highlighting their strengths and Areas of Improvement based on the Admissions Evaluation. Do NOT include or repeat metadata headers like "Candidate Name: ...", "Email: ...", "Overall Score: ...", "Status Recommendation: ...".
5. Use "Areas of Improvement" instead of "Weaknesses" or "Limitations" when discussing candidate improvement points.
6. The email content must match the final status:
   - ACCEPT: Enthusiastic, welcoming, congratulatory. Outline next steps.
   - WAITLIST: Encouraging, positive, realistic. Explain that capacity is filled and they are on the waitlist.
   - REJECT: Empathetic, respectful, professional, and positive. Highlight constructive feedback, and explicitly include the phrase: "We wish seeing you in other bootcamp opportunities."
7. The body must be formatted using clean HTML tags (paragraphs, bold text, bullet lists) with inline CSS styles to make it look premium. Do not include <html> or <body> outer tags.
8. Output the result strictly matching the requested schema with a subject and body.
"""

        api_key = os.getenv("GEMINI_API_KEY")
        email_data = None

        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-3.1-flash-lite",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=EmailResponseSchema,
                        temperature=0.3
                    )
                )
                email_data = json.loads(response.text.strip())
            except Exception as e:
                print(f"Error drafting email with Gemini: {e}. Falling back to default email template.")

        if not email_data:
            email_data = EmailAgent._fallback_email(first_name, recommendation, cleaned_feedback)

        # 1. Save email locally as HTML/text file for admin preview
        sent_emails_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sent_emails")
        os.makedirs(sent_emails_dir, exist_ok=True)
        email_filename = f"email_{candidate_id}.html"
        email_filepath = os.path.join(sent_emails_dir, email_filename)

        full_html_content = f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333; line-height: 1.6; background-color: #f9f9f9; padding: 20px; }}
  .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
  .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }}
  .header h2 {{ margin: 0; color: #1e3a8a; }}
  .footer {{ border-top: 1px solid #eeeeee; padding-top: 15px; margin-top: 25px; font-size: 11px; color: #777777; }}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Agentic AI Bootcamp Results</h2>
    </div>
    <div class="content">
      {email_data['body']}
    </div>
    <div class="footer">
      This is an automated notification from the admissions platform. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>"""

        with open(email_filepath, "w", encoding="utf-8") as f:
            f.write(full_html_content)

        print(f"Saved candidate email draft locally: {email_filepath}")

        # 2. Attempt real SMTP delivery if configured
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = os.getenv("SMTP_PORT")
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM", "admissions@bootcamp.com")

        if smtp_host and smtp_port and smtp_user and smtp_pass:
            try:
                # Setup email message
                msg = MIMEMultipart("alternative")
                msg["Subject"] = email_data["subject"]
                msg["From"] = smtp_from
                msg["To"] = email_address

                # Strip HTML tags for the text fallback
                import re
                text_fallback = re.sub('<[^<]+?>', '', email_data["body"])
                part1 = MIMEText(text_fallback, "plain")
                part2 = MIMEText(full_html_content, "html")
                msg.attach(part1)
                msg.attach(part2)

                # Send the message via local SMTP server.
                with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [email_address], msg.as_string())
                print(f"Email sent successfully via SMTP to {email_address}")
            except Exception as smtp_err:
                print(f"Failed to send email via SMTP to {email_address}: {smtp_err}")
        else:
            print("SMTP configurations not found in environment. Email delivery simulated successfully.")

        # Update candidate status in database to reflect email sent
        InterviewRepository.save_candidate_profile(db, candidate_id, {"email_sent": True})
        return True

    @staticmethod
    def _fallback_email(name: str, recommendation: str, evaluation: str) -> dict:
        """
        Fallback email template generation.
        """
        subject = f"Agentic AI Bootcamp Results - Admissions Update"
        
        feedback_section = ""
        if evaluation:
            feedback_section = f"<div style='background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;'><strong>Feedback from the Panel:</strong><br/><div style='margin-top: 10px;'>{evaluation}</div></div>"

        if recommendation == "ACCEPT":
            body = f"""<p>Dear {name},</p>
<p>Congratulations! We are pleased to inform you that you have been <strong>Accepted</strong> into the Agentic AI Bootcamp.</p>
<p>The Admissions Panel was highly impressed by your interview performance. Here is some feedback from your screen:</p>
{feedback_section}
<p>We will follow up with registration details, onboarding documents, and orientation dates within the next 48 hours.</p>
<p>Welcome to the program!</p>
<p>Best regards,<br>Admissions Team</p>"""
        elif recommendation == "WAITLIST":
            body = f"""<p>Dear {name},</p>
<p>Thank you for completing your technical admissions interview.</p>
<p>The Admissions Panel has placed your application on the <strong>Waitlist</strong>. While you demonstrated promising skills, our current capacity is filled. Here is some feedback from the panel:</p>
{feedback_section}
<p>We will review waitlisted applicants as seats open up and update you accordingly. Thank you for your patience and interest in our program.</p>
<p>Best regards,<br>Admissions Team</p>"""
        else:
            body = f"""<p>Dear {name},</p>
<p>Thank you for taking the time to interview for our Agentic AI Bootcamp.</p>
<p>After careful review of your admissions screen, we regret to inform you that we are unable to offer you admission for the upcoming cohort. Here is some feedback from the panel:</p>
{feedback_section}
<p>We encourage you to continue developing your fundamentals. We wish seeing you in other bootcamp opportunities, and we invite you to reapply in a future admissions cycle.</p>
<p>Best regards,<br>Admissions Team</p>"""

        return {
            "subject": subject,
            "body": body
        }

    @staticmethod
    def _clean_feedback_for_email(evaluation: str) -> str:
        """
        Strips candidate metadata headers and transforms evaluation report markdown
        into a clean, encouraging HTML representation suitable for emails.
        Converts Weaknesses into Areas of Improvement.
        """
        if not evaluation:
            return ""
            
        lines = evaluation.split("\n")
        clean_lines = []
        in_header = True
        
        for line in lines:
            stripped = line.strip()
            # The header metadata block ends with the first '---' line
            if in_header:
                if stripped == "---":
                    in_header = False
                continue
                
            # Rename headings
            if "#### Strengths & Weaknesses" in line or "#### Strengths & Areas of Improvement" in line:
                # We don't need a double header, let's keep it clean
                continue
            if "Weaknesses/Limitations:" in line or "Weaknesses:" in line or "Areas of Improvement:" in line:
                clean_lines.append("<strong>Areas of Improvement:</strong>")
                continue
            if "Strengths:" in line:
                clean_lines.append("<strong>Strengths:</strong>")
                continue
            if "#### Executive Summary" in line:
                clean_lines.append("<strong>Executive Summary:</strong>")
                continue
            if "#### Technical Skill Gaps" in line:
                clean_lines.append("<strong>Technical Skill Gaps:</strong>")
                continue
            if stripped == "---":
                clean_lines.append("<hr style='border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;' />")
                continue
                
            # Format bullets into HTML list items
            if stripped.startswith("- ") or stripped.startswith("* "):
                clean_lines.append(f"<li>{stripped[2:]}</li>")
            elif stripped.startswith("  - ") or stripped.startswith("  * "):
                clean_lines.append(f"<li style='margin-left: 15px;'>{stripped[4:]}</li>")
            else:
                if stripped:
                    clean_lines.append(f"<p>{stripped}</p>")
                    
        # Properly wrap lists of <li> items in <ul> tag blocks
        html_result = []
        in_list = False
        for line in clean_lines:
            if line.startswith("<li>") or line.startswith("<li "):
                if not in_list:
                    html_result.append("<ul style='margin-top: 5px; margin-bottom: 5px; padding-left: 20px;'>")
                    in_list = True
                html_result.append(line)
            else:
                if in_list:
                    html_result.append("</ul>")
                    in_list = False
                html_result.append(line)
        if in_list:
            html_result.append("</ul>")
            
        return "\n".join(html_result)
