import base64
import io
import logging
from typing import Any
from flask import Response, g, request
from flask_appbuilder.api import expose, protect, safe, BaseApi
from superset.constants import RouteMethod
from superset.views.base_api import (
    BaseSupersetModelRestApi,
    requires_form_data,
    requires_json,
    statsd_metrics,
)
from superset.extensions import event_logger
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError
from superset.reports.notifications.email import send_email_smtp
from superset import app

logger = logging.getLogger(__name__)


class CustomApi(BaseApi):
    resource_name = "custom"
    allow_browser_login = True
    class_permission_name = "CustomModelView"
    method_permission_name = {
        "fetch_report": "read",
        "greeting": "read",
        "get": "read",
    }

    def fetch_report_from_drive(self, **kwargs: Any) -> bytes:
        try:
            API_KEY = app.config.get("GOOGLE_KEY")
            logging.info(f"API_KEY: {API_KEY}")
            # Create drive api client
            service = build("drive", "v3", developerKey=API_KEY)
            # Fetch report attachment
            # Get document id from kwargs
            document_id = kwargs.get("document_id")
            application_type = kwargs.get("application_type")
            # Get report attachment
            request = service.files().export_media(
                fileId=document_id, mimeType=application_type
            )
            file = io.BytesIO()
            downloader = MediaIoBaseDownload(file, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                print(f"Download {int(status.progress() * 100)}%.")
        except HttpError as error:
            print(f"An error occurred: {error}")
            file = None
        except Exception as ex:
            logger.error(
                "Error fetching report attachment %s: %s",
                self.__class__.__name__,
                str(ex),
                exc_info=True,
            )
            file = None
        return file.getvalue()

    @expose("/greeting")
    def greeting(self):
        return self.response(200, message="Hello")

    @expose("/send_report/", methods=["POST"])
    @safe
    @requires_form_data
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.send_report",
        log_to_statsd=False,
    )
    def import_(self) -> Response:
        """Send a report
        ---
        post:
          description: >-
            Send a report
          requestBody:
            required: true
            content:
              multipart/form-data:
                schema:
                  type: object
                  properties:
                    document_id:
                      type: string
                    to:
                      type: string
                    subject:
                      type: string
                    message:
                      type: string
                    from:
                      type: string
                    to:
                      type: string
                    attachment:
                      type: string
                      format: binary
          responses:
            200:
              description: Report sent
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      message:
                        type: string
            401:
              $ref: '#/components/responses/401'
            403:
              $ref: '#/components/responses/403'
            404:
              $ref: '#/components/responses/404'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """

        print(request.files.get("attachment"))
        document_id = request.form.get("document_id")
        email = request.form.get("to")
        subject = request.form.get("subject")
        message = request.form.get("message")
        from_sender = request.form.get("from")
        to = request.form.get("to")
        attachment = request.files.get("attachment")
        # convert attachment to bytes
        # attachment = attachment.read()

        if not document_id:
            return self.response_422(message="Document id is required")
        if not email:
            return self.response_422(message="Email is required")
        if not subject:
            return self.response_422(message="Subject is required")
        if not message:
            return self.response_422(message="Message is required")
        if not from_sender:
            return self.response_422(message="From is required")
        if not to:
            return self.response_422(message="To is required")
        if not attachment:
            return self.response_422(message="Attachment is required")

            # attempt to send email
        try:
            send_email_smtp(
                to=to,
                subject=subject,
                html_content=message,
                config=app.config,
                data={attachment.filename: attachment.read()},
                mime_subtype="related",
                # dryrun=True,
            )
            return self.response(200, message="Report sent")
        except Exception as ex:
            logger.error(
                "Error sending report %s: %s",
                self.__class__.__name__,
                str(ex),
                exc_info=True,
            )
            return self.response_422(message=str(ex))

    @expose("/report_attachment/", methods=["GET"])
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.fetch_report",
        log_to_statsd=False,
    )
    def fetch_report(self, **kwargs: Any) -> Response:
        """Fetch a report attachment
        ---
        get:
          description: >-
            Fetch a report attachment
          responses:
            200:
              description: Report attachment
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      message:
                        type: string
            401:
              $ref: '#/components/responses/401'
            403:
              $ref: '#/components/responses/403'
            404:
              $ref: '#/components/responses/404'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Fetch report attachment
            # CreateReportScheduleCommand(g.user, {}).run()
            application_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            if request.args.get("document_id"):
                logger.log(
                    15, "Fetching report attachment", request.args.get("document_id")
                )
                document_id = request.args.get("document_id")
            else:
                document_id = "1sw98ttCOGnn3ybNvlpLIZlJzO-G4T_-L5P8tOo92f3A"
            report_attachment = self.fetch_report_from_drive(
                document_id=document_id, application_type=application_type
            )
            if report_attachment is None:
                return self.response_404()
            print(request.json)
            print(g.user)
            # convert bytes to base64
            report_attachment = base64.b64encode(report_attachment).decode("utf-8")
            # should be retured as a file
            return self.response(
                200,
                message="Report attachment",
                response=report_attachment,
                headers={"Content-Type": application_type},
            )
        except Exception as ex:
            logger.error(
                "Error fetching report attachment %s: %s",
                self.__class__.__name__,
                str(ex),
                exc_info=True,
            )
            return self.response_422(message=str(ex))
