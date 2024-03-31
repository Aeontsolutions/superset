import AntdForm from 'antd/lib/form';
import { makeApi } from '@superset-ui/core';
import React, { useEffect, useState } from 'react';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import Form from '../Form/Form';
import Modal from '../Modal';
import { FormItem } from '../Form';
import { Input, TextArea } from '../Input';
import Loading from '../Loading';

interface Values {
  from: string;
  to: string;
  subject: string;
  message: string;
  attachment: File;
  document_id?: string;
}

interface GenerateReportModalProps {
  show: boolean;
  onHide: () => void;
  name?: string;
  title: string;
  responsive?: boolean;
  closable?: boolean;
  destroyOnClose?: boolean;
}

function UploadAttachment({
  file,
  onChange,
  value,
}: Readonly<{ file: File; onChange?: () => void; value?: File }>) {
  const fileName = file?.name;
  const fileUrl = URL.createObjectURL(file);
  return (
    <div className="ant-upload-list ant-upload-list-text">
      <input
        type="file"
        name="attachment"
        onChange={onChange}
        className="hidden hide d-none"
      />
      <div className="ant-upload-list-text-container">
        <div className="ant-upload-list-item ant-upload-list-item-done ant-upload-list-item-list-type-text">
          <div className="ant-upload-list-item-info">
            <span className="ant-upload-span">
              <div className="ant-upload-text-icon">
                <span
                  role="img"
                  aria-label="paper-clip"
                  className="anticon anticon-paper-clip"
                >
                  <svg
                    viewBox="64 64 896 896"
                    focusable="false"
                    data-icon="paper-clip"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z" />
                  </svg>
                </span>
              </div>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="ant-upload-list-item-name"
                title={fileName}
                href={fileUrl}
              >
                {fileName}
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GenerateReportModal({
  show,
  onHide,
  name,
  title,
  responsive,
  closable,
  destroyOnClose,
}: Readonly<GenerateReportModalProps>) {
  const [form] = AntdForm.useForm<Values>();

  const { addSuccessToast, addWarningToast, addDangerToast } = useToasts();

  const REPORT_NAME = 'report.docx';
  const DOCUMENT_ID = '1sw98ttCOGnn3ybNvlpLIZlJzO-G4T_-L5P8tOo92f3A';

  const [loading, setLoading] = useState<boolean>(false);

  const getAttachment = async (fileName: string) => {
    try {
      const response = makeApi<
        void,
        {
          // Success Message
          message: string;
          // Response Data in base64 format
          response: string;
          // headers contain the document type
          headers: { [key: string]: string };
        }
      >({
        method: 'GET',
        endpoint: '/api/v1/custom/report_attachment/',
        searchParams: { fileName, document_id: DOCUMENT_ID },
      });
      const result = await response();
      return result;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const convertBase64ToFile = (base64: string, fileName: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return file;
  };

  useEffect(() => {
    async function callApi() {
      setLoading(true);
      const file = await getAttachment(REPORT_NAME);
      if (!file) {
        setLoading(false);
        return;
      }
      const fileData = convertBase64ToFile(file.response, REPORT_NAME);
      form.setFieldsValue({ attachment: fileData });
      setLoading(false);
    }
    callApi();
  }, [form]);

  const onSuccess = () => {
    onHide();
    // notification.success({
    //     message: 'Report Generated',
    //     description: 'Your report has been generated and sent successfully',
    //     duration: 3,
    //     placement: 'bottomRight',
    // })
    addSuccessToast('Your report has been generated and sent successfully');
  };

  const onHandleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.document_id = DOCUMENT_ID;
      const reportForm = new FormData();
      reportForm.append('document_id', DOCUMENT_ID);
      reportForm.append('from', values.from);
      reportForm.append('to', values.to);
      reportForm.append('subject', values.subject);
      reportForm.append('message', values.message);
      reportForm.append('attachment', values.attachment);
      const response = makeApi<
        void,
        {
          // Success Message
          message: string;
        }
      >({
        method: 'POST',
        endpoint: '/api/v1/custom/send_report/',
        body: reportForm,
        requestType: 'form',
      });
      const { message } = await response();
      if (message.toLowerCase() === 'report sent') {
        form.resetFields();
        onSuccess();
      } else {
        addWarningToast(message);
      }
      return message;
    } catch (error) {
      console.error(error);
      addDangerToast('An error occurred while sending the report');
      return null;
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      name={name}
      title={title}
      responsive={responsive}
      closable={closable}
      destroyOnClose={destroyOnClose}
      onHandledPrimaryAction={onHandleSubmit}
      primaryButtonName="Send"
    >
      {loading ? (
        <Loading position="inline-centered" />
      ) : (
        <Form form={form} layout="vertical" name="generate_report_form">
          <FormItem
            name="from"
            label="From"
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <Input />
          </FormItem>
          <FormItem
            name="to"
            label="To"
            rules={[
              { required: true, message: "Please enter the recipient's email" },
            ]}
          >
            <Input />
          </FormItem>
          <FormItem
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter the subject' }]}
          >
            <Input />
          </FormItem>
          <FormItem
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter the message' }]}
          >
            <TextArea />
          </FormItem>
          <FormItem
            name="attachment"
            label="Attachment"
            rules={[{ required: true }]}
          >
            {form.getFieldValue('attachment') && (
              <UploadAttachment file={form.getFieldValue('attachment')} />
            )}
          </FormItem>
        </Form>
      )}
    </Modal>
  );
}
