import React from "react";
import { Form, Input, Button, message, Upload } from "antd";
import ReactDOM from "react-dom";
import { updateNote } from "../../../service/post";
import "./popup.css";
import ImgCrop from "antd-img-crop";
import { PlusOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

interface ModalEditProps {
  open: boolean;
  onClose: () => void;
  noteId: number;
  initialValues: {
    title: string;
    description: string;
    picture?: string; // เพิ่ม field นี้สำหรับแสดงรูปเดิม
  };
  onNoteUpdate: () => void;
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
  const [fileList, setFileList] = React.useState<UploadFile[]>([]);

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  const onChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const onPreview = async (file: UploadFile) => {
    let src = file.url as string;
    if (!src) {
      src = await getBase64(file.originFileObj as File);
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow?.document.write(image.outerHTML);
  };

  // เมื่อเปิด modal ให้โหลดค่ารูปเดิมเข้า fileList
  React.useEffect(() => {
    if (initialValues.picture) {
      setFileList([
        {
          uid: "-1",
          name: "current-image.png",
          status: "done",
          url: initialValues.picture,
        },
      ]);
    } else {
      setFileList([]);
    }
  }, [initialValues.picture]);

  if (!open) return null;

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      let pictureBase64: string | null = initialValues.picture || null;

      // ถ้ามีการอัปโหลดใหม่
      if (fileList.length > 0 && fileList[0].originFileObj) {
        pictureBase64 = await getBase64(fileList[0].originFileObj as File);
      }

      const res = await updateNote(noteId, {
        title: values.title,
        description: values.description,
        status: "active",
        picture: pictureBase64,
      });

      if (res) {
        messageApi.success("อัปเดต Note สำเร็จ!");
        onNoteUpdate();
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
            <Form.Item label="รูปประจำตัว">
              <ImgCrop rotationSlider>
                <Upload
                  fileList={fileList}
                  onChange={onChange}
                  onPreview={onPreview}
                  beforeUpload={(file) => {
                    setFileList([file]);
                    return false;
                  }}
                  maxCount={1}
                  listType="picture-card"
                >
                  {fileList.length < 1 && (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>อัพโหลด</div>
                    </div>
                  )}
                </Upload>
              </ImgCrop>
            </Form.Item>

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
