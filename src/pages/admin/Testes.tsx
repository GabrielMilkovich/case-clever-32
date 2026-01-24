import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { RegressionTestRunner } from "@/components/admin/RegressionTestRunner";

export default function AdminTestes() {
  return (
    <MainLayoutPremium
      breadcrumbs={[
        { label: "Administração" },
        { label: "Testes de Regressão" },
      ]}
      title="Testes de Regressão"
    >
      <RegressionTestRunner />
    </MainLayoutPremium>
  );
}
