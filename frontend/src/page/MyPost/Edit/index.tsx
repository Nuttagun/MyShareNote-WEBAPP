import React from "react";
import { Form, Input, Button, message } from "antd";
import ReactDOM from "react-dom";
import { updateNote } from "../../../service/post";
import "./popup.css";

interface ModalEditProps {
  open: boolean;
  onClose: () => void;
  noteId: number;
  initialValues: {
    title: string;
    description: string;
  };
  onNoteUpdate: () => void; // callback หลังจากแก้ไขสำเร็จ เช่น reload รายการ
}

const ModalEdit: React.FC<ModalEditProps> = ({
  open,
  onClose,
  noteId,
  initialValues,
  onNoteUpdate,
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = React.useState(false);

  if (!open) return null;

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await updateNote(noteId, {
        title: values.title,
        description: values.description,
        status: "active", // ถ้าต้องการใส่ค่า status เสมอ
      });

      if (res) {
        messageApi.success("อัปเดต Note สำเร็จ!");
        onNoteUpdate(); // callback กลับไปยังหน้าหลัก
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        messageApi.error("ไม่สามารถอัปเดต Note ได้");
      }
    } catch (error) {
      messageApi.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      {contextHolder}
      <div className="overlay" />
      <div className="modal">
        <div>
          <p className="text">Edit Note</p>
          <Form
            form={form}
            name="editNoteForm"
            onFinish={onFinish}
            layout="vertical"
            initialValues={initialValues}
          >
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: "Please enter the note title!" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: "Please enter the description!" }]}
            >
              <Input.TextArea rows={4} style={{ width: "400px" }} />
            </Form.Item>

            <Form.Item className="box-button-reviews">
              <Button type="default" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ marginLeft: "8px" }}
                loading={loading}
              >
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ModalEdit;
