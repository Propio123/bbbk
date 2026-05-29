import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

// Configuración de idioma para el calendario
LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: [
    "Ene.",
    "Feb.",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul.",
    "Ago",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dic.",
  ],
  dayNames: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  today: "Hoy",
};
LocaleConfig.defaultLocale = "es";

const SERVICIOS = [
  {
    id: "gen",
    nombre: "General",
    duracion: 30,
    medico: "Dra. Doménica Palma",
    img: {
      uri: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500",
    },
  },
  {
    id: "ort",
    nombre: "Ortodoncia",
    duracion: 30,
    medico: "Dr. Bladimir Denavidez",
    img: {
      uri: "https://www.clinicadentallarranaga.com/wp-content/uploads/que_es_una_ortodoncia.jpg",
    },
  },
  {
    id: "end",
    nombre: "Endodoncia",
    duracion: 60,
    medico: "Dr. Xavier C.",
    img: {
      uri: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500",
    },
  },
  {
    id: "cir",
    nombre: "Cirugía",
    duracion: 90,
    medico: "Dr. Darwin Congo",
    img: {
      uri: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=500",
    },
  },
  {
    id: "est",
    nombre: "Estética",
    duracion: 45,
    medico: "Dr. Santiago Benalcazar",
    img: {
      uri: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500",
    },
  },
  {
    id: "per",
    nombre: "Periodoncia",
    duracion: 30,
    medico: "Dra. Eliana Cespedes",
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaqA3a4FMjxIamyVTtGQj7cPs0qTjRjelO7g&s",
    },
  },
  {
    id: "reh",
    nombre: "Rehabilitación",
    duracion: 60,
    medico: "Dr. Jose Cargua",
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGRLV8Z4wKO2wubIje4glcRu0QajOV7ermLg&s",
    },
  },
  {
    id: "adop",
    nombre: "Odontopediatría",
    duracion: 60,
    medico: "Dra. Sofía Benavides",
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdw1rCOOQ4GmqRr7LCRE9MmB8GJtgpydrJSg&s",
    },
  },
  {
    id: "adop",
    nombre: "Rayos X",
    duracion: 60,
    medico: "Dra. Sofía Benavides",
    img: {
      uri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUTExMWFhUXGBsbFxgYGBgaGBodGBcYGhoYGh0aHSggGBolHRgYITEhJSkrLi4uGh8zODMtNygtLisBCgoKDg0OGhAQGy8lHyUtLS0tLSstLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAJYBUQMBIgACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAAFBgMEBwACAQj/xABDEAABAgQDBQUGBQIEBAcAAAABAhEAAwQhBRIxBkFRYXEigZGh8BMyscHR4QdCUtLxFJJicoKiFSMzwhYXRFOTsuL/xAAZAQADAQEBAAAAAAAAAAAAAAABAgMABAX/xAAkEQACAgICAgMBAQEBAAAAAAAAAQIRAyESMRNBBCIyUWFxI//aAAwDAQACEQMRAD8AyEJMHcEllaJiD+ZBHlbzaA+XSGPZ+Uxj3ca2cWR6FEKveGrZCUkTpaiz5hd9BYHyMKk4Xhg2WPbABLuGESw/pofL+RmriKeZkUpKUpJABfk7AXNiLtF/CaSRPdIVqeySFC/AEjfz5R5xrBTNWlYdsqbu/jxPLzibD6FnzgpTubeHsRaOq9HJqhsp8F9tSzqNX5g6TrlVuPcQk9xjLpmxdUFlKpZBBYgX8G1Ebds2slIayhv1eDNZlZygZ+Y+ccjzcZVVjxtLRlGCbJtl9oCCOX0h2k4GPygR6qKmYHLHkAAB10gbNxadKvnbl9YdynLoT/oVmbPLPLxijO2RWr8zeEUKv8RZktPuIV3q+kK+I/jFUgsmTLHXNCVmXdDKKl0OknYtYPv+vGClPsuoaqjKE/jHW/8Atyf7VfugjS/i/Vn3kyu5J/dA/wDaXTQ3jrtGi1WyRUPvHvDtlzLBDnV9TCJ/5sz/ANI7kj6wRwr8UlrV202/0xnD5FejVH/R0Xgi2Ic+MC5uFTnY3HfBzB9okTw4eCE5SiOyW6gGIeXJF1JGcYtaMt2s2XMwZsrlrwm4ZsgVWKI17aZVSEtLIB45QfjCngE2tzkKUP7Ex245txvQltaQOw/8P0P2kQ74LsdIlg/8sXj7RmqzkqUnL/lEGKaumAHMR4RHJOfoy32A67YqmJf2YiGTslTiwlt3CClZjS7tl8ICTsZqipkhHVvvBh5GtszoL0+zVOB7vkI9zNm6dR93Tl949UKpwSCspKjuA+8FJM1X6X8YlKU17CkhPr9kKdUwkv3A/WLuG7KyEaP3g/WLVdjYlqOdMsX3q+VzHuj2xo3YzEA8tPEgQ8pZeOrAki2rBUMz+X2gbWbMSlaqT4faD4x6lZ/bIb/MIqzdoqHfUyv/AJEj5xGOTKvTHcYi+rZaQ3vjqIGYzs1TKQR7Qv8A5Yb0V9Ir3VoV0Ukx06npiHf184sssk92JxMOr8AlIchYLf4VA/Bou7F7Pe2qUEg+zl9tTixKbpHjfujVU7PUavysDuaL9PTU0pBlyWD8XH8xWXyFVJMOzLtt61Mye2cdkBIG9rv5wsT1pCCcwAsNW179Y1Or2Up1lRKUudbl3398A8T2Uky8uVJUAX90PwvFYZI1SFujPva+0VkSQxsG0fc/T6wSxsyxKlpzdpOf/cQ+7lF6poXWkS0gF9ALa2J3cniHaaiByrb3kWO+wZXe/wARFLGtWgds8sqWANHPwihtFPdbcIu7LAhauT/CB+Pyv+YTxMBvQ6/YBmpiAy4IiVEapMcksVnQpFHJHRa9ieEdE/ENyL8iS6hDJhiQAXtYnwBgXTSmi9PXlQo/4T52juWjlk70KWIAZyxt94L7LLSmchRds27z+kBKi6o5E42D24RyKaU2zocbjRvOGYlLCVZlIPFIuzseZf7wSpE0/vDxCj43+EZZsxUiZ2UG7BwSBpwDudee+NCwmUSGcOz24Pu8TaLSS7TOJqnQ+4UlDOAe8vBJSARcCBWEDsjkAD13wTmHsx5mX9FovRTmUCSXv64QKxPZlK3KFX4EOIJTq1KTdQ3DmeGUDoYuy5gbX0YfnOOwUmY1tNhHsnSUnMNznndxZtIzPGKc5iePWP0dtZTImJYsC1iz20PxjHMewnKoixfePpuPKPQxy8kNixfFiCmSYJ0VKTuhtwjZ8KGhvyeDGHYC6g6Wdtwvv4QYwUR5ZbFiRhJLOLchBvCsJv7j306Na3SH+k2cATo3UH0Yqz0CWWRu1Onlug+RPoi2y5gFN7FADMq3rf6eGumqSweM+k4spJGZ72dxx+/xhspKnODx+0c2WF9hiyTFsZS+Vw+kRYZT/mJfp84AYjhxMzNv4wewRBCA934aCM4qMdGu3stzJrqaPk1AYuWHUx9MgBTmJJqk29aQl/wIPpsOCi4STzJPxMXpGHyUF1HMR4CJZ88JGvrvgP8A8TzXS2rA/wDcfJhzjfaRtIK12LS5QsPAaWJv4Qtr2tUTpYu1+o0s2m/7RRxbMXTxF1byCdOsAvZG7E249Srp3RbHhikK5MVtr5c72pK1KIVcXJF7hooYJRlSxr1e8NqlhSihacybAcjZ2fXf4wUocIlBilr6hQAIvxFo6LoblqgZUYaSkZVEGFnFMJWD9XvGtUuGoJsoKGhA03WvAHanDwm4H1hVkt0Km0Z1R4UdQ78i3yhgwnBqwsoKUpD8frugrhWEmYoDKQPlGoUlKmXKCUhreEDJlUOhrbEeTMmpGVSVA77nhBfCc7uxDkai/XlZ4KV8sBLk6X4+tIrUABKOfa1O5h0e8Sc7QtBZMreb/H7xVxCkSq+bK3X0OsFEi0BqqoQxSV9oOGueG/dpEYttjMA1NIhCnGp1UfTQtY9KSElO7UW00fpqPCJ9ocVQCQS3A6Ed2reEKOJbQHKEe+GYqIv3HQ24x2xVbYqi30S7NoHtFDi/KPO0lGxePGCVIzpKePr5wYxunzoO8i8OM9SEfK8SS0RIZbRwEKVs72Qjo9OeEfIIAvIpSfXr0IrYwGQ3GGuTSOCd+8kfM674oY9gy1hOQak/KA2TUtmbzReLdNhalXNhBaXhGRZBud8HKGj4xGOFdyLyy10UsJw4BiIfsHUqSHUo9De3CB2E0ARc3O7lBrDaNU+ZlHupYrO4B7DqT8IpJqjnbtjlg8w5H1fQ+vDugnP9w9IpIklKQEpc6DcBzj4ZxMo3uxfqI4ZK3aGRQSpyFa+XcOPDneDClMEjl8IzTZ3GJ0ypSkqdIcl+Vg/HWNAlz3UMw3W3DiXimSFARV2hUfZuPW5r6QgVM8KUykp1Z78Onnyh62mmPTrKdQkkeEZ9h1UmYrPZnsHG59+voRXD+QMacOlpCbAe7uiSjJ9oAH1Y2+9rcI806wLBtIs4cBnNtYzAMcpTj+IHLw4KWSH9ehFwKZNolksA9tY57roYWcUwtKGUw1J0fhaPeG1CmNvLlBLGwS3D6aR5oKcJQAYry+uwVsHLUSvtGzcGg3hs9AcdPVoWtoqkJUAPXp47BKksSQLmDKNxAnTC+0GMJSAAN5flFGirc5DPrx49eUQ47ThTFmD+tO7wj1g1IMzjdf5RlFKJn2F8blAocksNW4Np3ws4atSl5QbZi/O+7whlxJYUhQPpoX8GmgTT9e+/jGh+TPst46jKBr4Ws/neBFBSOCovqdYMbRB5bjUfDuMDKCe0snQD1bxh4/kDBQlJTOII3+j5iCdf2UAgG2nrfrFGrvPSRwHx+0GVSgqWxO74fxDN9GJMBqL8PhFjF5AUntePyPlFXA5QSTyYa2015m8E62bLyHMdOAib/Wg+gXh9SlPZSCS/vFLaasH4t3Q0qWcgbgIz7D8STPqkS5SSlJUVLJZywJPc7CNDqJmVhxHwhci2gop1UwZLkMQAT9fOB+E1oXNypHugDV9+7uSIjxqWVyFpBLqSW8HHnAP8OgozVu9gNeN7Qyj9WzGiLBtfdCVtCv2cw8TceX084bFlal9kdkWL7+cC9psHVOl9gOtLlI/UwunqRpzieNqL2FqzIdpEBZKnIJ16wtrpFbiD5Hwg3jc28QyZYUkON0djSY8XSKuGqUhVxDsicFJBPhC3SUisxa4hppcMKkuk3tG6Em7Yr19CAotFIyIYq/DJgJd9Nwc3igaVh6eCZMFZBz8vrHRd9gfRMdBGse8Olks4tzbQ7uf3hhqqEeyFtICYMLgqe+7h94c5UjNLb1yjmnKmTSMnxSiaced/GLuG0j3OkEdoKRpgLHgfl849SQyYrejEE1LG0aDsXSAUiVNeYSo+JA8ABGf1ExLXiXC9uZlLLMsJC0hyh3sSXY30cxHNCU41EMGk9mtCTbdFSZTD3ecZVQ/ifVhbzcikHclLFPS9xyPjDJP/ABRphKKkpUuY1ksRfqRHL4MsSrcWfNn9nghc1YGs2YEnglKyEgd0MkzCszXNh5xW2OxeVVU6FJUM1ytO8E3Ig5Nny0EBcxCSdAVAE92+DkyyUqFUbAs2hJllKr6jqN3lGOVWELp61dPc5C45pLFKu8GN97CvdUD0MLOKYNJm1ZWuYEr9mlIDpBISVHf1imHNt2ZqhRo1TAr7QToJs0zHCCRo+638wZTgcxL9lxuIbxaCEqmyU6bXzEnvUYpLKvQiiwPMxBYs2/Th4wYocy5IUAT8dYgXKzOojvbhB+hlBMtIGgSPhEcs0kNFWKeM12VLl7MfCPkjE3QLem8ot4xRiYWayix77RHQ0CQkAgW+UVTXEUUNoqt1h7W174JYJ25bjSBm3NN7pSNVBI/16eYg5g8lMtIQNBbq2+Kv8gLlZ7ozaWvEuCgEEDUaxZqpCVySl7s47rx8wVATJzAXW5vw3eQiLeglTFJKghZsLH4QoYDV551uDqPM/wAGGDHJyt+nWEjZn2kqdNY+6spHMDTyMWgvqAcMfWRKJips5TKnSrGxUb62BYfCK2OVkxciYLe6SLcA8ENmqr2UiWkKD+zSS/EpBJEbaiYA4pKmyqkp/wANleP1hjocPmrQcvDV2fpHypR7YGZYlEwA/wCVSQ3e484ZMNATLDkIR+pTJfo8LOdI1WJ+y2GrAUVEntrFyfylvkIYp+HqKSH3RaVOkIL+2QAVG5O/fpyaLNTWyEhLLK3u6SGb4QkptvoNC9sBgeRVTMUO0mZ7NL7gwUSOrp8IcRIdTs5ZoWKDbCllTJktRupeYEe7cCxPEN8IJVW29HKB7YUeCSCYlkWRyuh1XsuTqUaNFfCsMTLmVGUNmmBfigP5ue+KNP8AiLQqQpZJQRqhYGY9GJfuhVlfiLN/qVTEy0mSoABB96z3B4l9NNIMYZWmqM6NTkSN5j17BiDGbY5+JS8rSEBNrlWo6CFeTt3WEELm5n0Oh8AwMKvjZHtug2qBv4gyEJrqhKGy53DbipIUR4kwMlLAAeIq6aVrKlF1EuSTcxJKS4aO+KpUD0H8ASFKO8Q+YbRsk8z8oz3ZaWUzCecavRpaWH4fG8TyuhH2CqukDcOLetIU8Tp8qmSnKDvy/OHWfAeukAgrJbKLczwHONCQAF/RK4HxEfYqf1Sv1D+7/wDUdFdgHKip2XuB00ub6w20oYbn+0AcPuA+o06cPXODEqe3q/lHHk2MivjmEpnJzMyuPwMI+KPKsY03OGJHeIV9o8KSsFQ0Oo4HiOD+EHDP0wyQgTJpJilikiziCFfRqlLAIsdDuPLryirPXHWhQCimmLVlQkqUdw5b+keqvD50otMlqT1jUfwzw1AEyoUkFSlZUPdkp1P9zj/TD3XYbT1AabLSev1jnyfIUJVRVbPzhh+JrkLKkKY6H1xEdNxJSlZ1KJV+p7+MbXjf4Y0c4BScyFgMClTAjVlcesZBtVsrMpCoqSpIHEgpbkfrDY80Z/kLjXZSXtDPSGTOmAclF/HWBtLjS5a8xUVOe05JPVzrEU+gnhOdUmaEEOFFCgkg6FyGI5wMXGlNropGCG6dttOy5ULVy1YDpvPhDHsZtdNMsSlrJCVEtxcu474zCUmC1AojSNF8uxZwSWjZanbNEhBWFFUw6IJJfqH052hhwTa4TpaFFIBKQ7HSw05RhC5hgls/j6pBuMyODsR0LeUaeGLJU10bWqtSlOdRAAI+OgihLqcxN7bh63xmuJbRLnntKZI0QNB14nnHI2zEpLEZiOd/CN4qQKbGjaZYUZY4TEnwcxBT1peyvAwjYjtUucUskjtAlzrY2F+cM+zsqZNTmTmA3Ag/xDpKgOLXY7SK05Nfyn4Rcw5R9ggBRcISP9sJ06lnXfN3KVBHDJK0oGZ07veL/CJuKoFnnFZcwkupR6fxAOkSEzJg3lT+LRZxjHEywXVm63+UZ/VbVTPbKXo50N7d0OtLYYxcuh6xGfl32IIPQhjAqRjiVSBlICkgAjpZxyhWxDaJU0EFg+rE+HKAK6tSS6S3HnGc1EpHE32M9btEtCJiUquspfmQf5i/h21hWge0WorTYZlE25PGezZxUXMS009oivkJyKvCqHmtxxU0s5Ke+5+kWKOvVlyhVuB3PwhTp58NOB7P1lSjPJp1rR+rspSehWQ/dHRyVbJShR79m+sQzZcHqPYzEVf+nUgAt21JHkCSRBGd+HdaE5gqWT+lyPAkMfKN5YL2haYkCnOsTpUEiH3Zz8OlzFZqpZSkaJQwJ6qN26NDXT/hzh6FJV7JSikuAuZMUnvSSyu+JT+Tji6CotmJVSFqRmCVZePzbXyirSEGP0vNoZQBJQnRnYPGCbfUCKWtmCWAEqAWlIsBn1A5Zgo98bFnWR9BarQv1iwDaJ6VUC1LJMMmyeDLqZgAByAjMfNhFrM1SG/Y/CCspO4XUfl1h4qQw6CPtDSCTLCEgAbzxP0iOqmO4jmlLkyYOmBz10gVjKW7Iuwv1MF6ZOUFZ6J+cQVtPYqPC0OnTAKP/Df8Ijo+e2HEf7vpHRbYByk9k2NjoYu/1DuR5fz0gUKlIYE2OnWPcqcxbl6+UQaCFhXMdefwi1TzUr136jX+RAOai4bTd4xZopjMR33Hrf8ACFcdBst1GEICSFMpCtxHo9OEK2LbHIIKpExQOYAINw54HXnfgYepXaASd+nxBZ4klUKU6C+7Tfr3wiyuPsagHg9AKWUlPAeJ3+JgjTYoAO3Y7gAS/IR1bNAsO0p2toO+I0U7F+AbxuYzqW2DoIprbA3D7t8D5GJSqiYcpExMgso2I9ooHQ6HKAb8TyjO9tNpitRkyVESxZSh+fkD+n4/Eh+FoIROb3c6fEJPyMHwJR5Bs01clCx20AvraAOKfhxhtQQpdMkEb5ZVLf8AzZCHgtLrEvle8Wk1YFuEcrU10VjJezK9u/wppZVPMn0hMpUtJVkUpSkKbd2iSFcL6xawf8LaVdOgrXMRMIBKkq39FAjwg3+IOPAIRTJP/NmqScv6UIUCVHqpISOPa4RawWpKUJBuTHRHyeO72JKWxYrvwoSEn2VSoq3BeUA94TCTi2wtdIcqTK4hplz0DN4kRteJ4qiUnMruHE8BF2oWF6gEcCHEFZci/RrPy/XUNQhLzEqSl23a9xinSUi1lh3n1vj9NYlhFPOlqlTZKCgg7mItqDqO6EbZfZeSuUhSR2WId9SlRSX7xFYyUtsPkpGdy8HShBWxJSkq1Idg5h82BxJS5RZKbc28oIY1gcqWhZc5RLmOSP8ACfnCLh9LlJyFfMixiqqS0Tbvs0wTlqXkyl9eTcXggadWRTtYGz8ukZ1hsyZ/UJQColUom76pmN84da+UsUszNMVaWolukJKNCmd7R0M1RUWCbnVQfrClTYcZiyC/ZF+bk+UbBP2dRlsNRvijgeCShPWgpDmU4twWRDNpjxm0qMsxDCsodPeNfCBEunKlZRH6Bqtnk5bJHpoXNkpyETauSAAoTnFrkHskX4FPnE5QjLY8czSMvRs7OUCQk24jy6w3bO7B006VLmrnTjnDkJSgAcQ5JPlDZjpUHJc5b8tHMJ2xe0BlzFSVe4VqUjk5OZPTQ+PGN4oKqRvJOSZrOB7D4aJQaQkkA/8AUZR631hs2fqkLp5RSwBQlgGAZmYNozM0I1Fi5LjeNOhuD8u6B/4fY8UzVUijYlSkclA9pI5EDN1B4xLJhck9ixnTs1mbMtFKrmlnBuIprqlAsNCPCIgVqcHuMQjioaU7K1DjqDPmyASFS2KX/MChJLcwTpwgwvEwAHYPv3Rlm0OEzxUzFoQpgoKCr2OUEN0MMWF4+ZkvItJE5IAWkhv9Q4pO7w3R0TwRdNCKTQaxXHkjsguW1/LGQfiGiZNmy15XcFLtexJAfhcsORhxqwp0lTsS2Y7jfwi8rCRMSHDkEKSo6OLuIrGMYIVSd2Z1gGxkyay5rJRuS/aV14CNYwPDZdNKZID/AOEWA4Dn9I8UmHqT2phOpUATpdhudhuESKnvYP66dD4QJSvSC232WhOJ1ty4D1rEKheI5CnNo9VVhC0ArO6so0BYRHjMzsW092PtMPHd9Yq4meyLNfi/fDpbAAP6VPAR0S5T+nyjoqKSypoU41HDnxixTVN8p3aF/KBdOGe7xeROCg+8a84DQQpLnEFm7mEFaCnBL9bDjv0t8oCyZ6SBdxo/5h8vrBjDphHMcd3WJS6ChipmYHlv5R7mzdzE9N/U7hFOSt/nFqUGPr0THHJU7KJkaaG4Ju3rw08Ip4rIzJMse6bLPF/y/Xwgx7T1v+0QTQlVt0aM3ewtGeYzszLWCQgILnQABtzp07xyhh2RwpNPTol2Ky6lHmr5AMO6LNRT9rflGmuu7rFWcshKi5Aa5uX4JEdTbkqJ9BBEyWV5ErSVbw949zyJUtSieynMT68oXsOIE5KmHZN7MXbpex48In2rrM0oSx+dXa5JT2jv5AQvB2kGxUwTCZk+qXUTnKlFwNGDlgOQAAh+o6IDdpzgNs+kC+/izbtIZpKrdYbLJ+gLYuY1SLmq4JTpzuPpDhKpuy3KKUyTwi6VEJsYhkk2kkPFALaqo9nKUE7xl8dYGbCysqVyhoDnTyzWI6Ol+8wRxekE1SUq925tvMXMFwtMpWZO8EeBBD+cUbUcdexe2A9tsNUqknBOuVQ8SRAPZjBs8sLa5bMOB0V9YfMfAMlaeL/GAuzcsyytFspuNbHQ/AQ0JvgZrdA4YL7KskkD8hSf9alH4pTBzaVGWmWG97s+Jv5QYVLClIVw+v3jxj8kLlsdHc9wNvOJeW5RDx0wFh03PIlqOpSAeoDH4QqTKgjFMqdEoSjqffV/927ob8NGSUE8FKHmpvKFmXS5qtcxrmYbvuDgN4R0w7Yg4K7KVKI92/gIwgV6pVUJwe6yVAbwouQe9jG61AJQscU/ENGbY5hCEJIbcz9Qz/ExsPsa6D1VUy5ksqTvS5duF4xpMkpnEjcskeOneLd8OEtZKACdLHhaAtZTnO40JseGl37vKLcAwdWaBgZSQhQvmSz+Y+JghKpEonpKQHzZnv7128bjoTAHZ+oOQcvL08E8TnkFCnAvxuTZu7jv8YVrZM0KbNASVWPZgVSYxoleUEuQRu7oq01UVywH3MW6QuVCCmY2pAuGOVLAAqUQbns6G0QjjW0xnIZ8YUpaTltZjbfdu5ye4wv0MlXtEqdW9iQ1uZJcJVbXQ98MGFzhMTq40e3yOoj3NkIQp2JKiB2Q5OgBJOgABdoZPjoBIvCxMRccxyIj7hKPZKyK3ns77AXZtG4feLNPWAFsyfM+u6PNVPSpOtyXB3htCInbemNokxNLh2cgnzF4DS5d3D94+j/KLsqvsAoiw3b93dELBybuXs/mYMVSoDPchBtoLW876x8rlABjoLn1xiX2jAqsPhwgHUVZW5UbeZ+kMlbAy7IL34+mipiZDHlEKK13A0iliNTbL4xRR2CwP/Uq4K8ftHRHl6+u+OiwCWTUg74tSCN2sZ3JxCYnRXjeGLCsdBssMeI0+0LQ7g0NkokORYsQeYgjhdexbgzg7+aT8oH4cUrALuOUHqTDEEgtE5NexUMNOsKS6T4GPSp+5++PNPLShtB0sY+LT5b2tyjl1ZQ8y1MDoflxjzNrGB+fgenGK88kF9PXlFWfNcX1G8W9G8Oo2LZdXNFgCPXDjEM+UPdBYjp1O6A/twD71zpY/E2j6msBUCWZ31uLNcE8Rrvh+ALL6ZWUF+fcHc+MBsQU5Kn5OwIA4DmYtVmJpUGGYO128WgdPmgF9D4ebGHimBhnDB2dCINyF8+mkLVNUsncesEsPqMyv4/mEnEKYeCniYmwinm039YnTNYRzSiUTKNXKObuienzgh9IrzMQAUQz98TIrgRo3q0O066F0RYrM7Cr7x8oF4RO7d+Px9GLOLT3TAqhDqca+PDjFYx+oG9jVPmMEkHQ+vhHzEro1ilMmun1wjxU1bpb0DE1DaDZYpJICA/XyhZTNyzA3H57vPxhh9orJYbvlAQyGV3/AGe8Vh7sVh5auyf8sJe0Mux1dy/Dv5w2SlOjuaFzaBH5QdTuYfxBx6ZmKMiUGI4Hz74E1qWmKbXczu45d0G5EpioN9uT6E+UDpwJUoJ7gLDvbXwjqRkz3s1OAmZCp83Ny7eXdDXiQaW4Vlbf63nSE6QlYUMq7i4AJ3WuBDTNmFcpgh1FgwD3txseXSFktgYTwCrHuub6Etc8AwbVyOsFMUp3AVYsXIOlt54twgBRLCXcAZbOLsXu6jbwZ+MW/wDixIyrBADOdHva4te3GJOO7RrLOHVSkkPoG0HcAw/Nyi/iFekpCXuRcBtDz3Qu+3JAKcob3QCNSbq4k8zEUuU2qne4AYDveDwTdmsPCYwIbe1jdnuSfJrb4+UxN+0ACRcPu5bzf4QOkO9rnXgBx3WH0gpR0hUx8LQrVGJ0y3NgeLlt1xbjpE9PSK3mLNJQtrc+UWKielCSomJOXpDUBMemMkJSDq5+QtrxhUqajdpDFiOICYnMP4hOxWuQbC55aeP0joxx0K9sspqwBaKNZiiQ7m/K5gRNmKP5rcvTwOqp6E668ItxQVELf8VH6VeX1joV/wCsTwHiY6BaKeMtIpTxSe+PkpTGK1LiA0IaLq8qg4JgKn0M7XYRoq9aC6FEH14w54JtapP/AFEOOI18PvCDSpHEwx4dRhYYvBlFNbJS0O9JtEieXSoFud+8boN0mIbleukZT/RCTMcDoXL/ABhnwXHcpCWCuKFano+vSIzxKtAseCgG4I+H8xBU0qVJuGPIX7rxYwyspphAAyqb3TbyJ+EE1yJejfGONz4uqY9WIOI0J0DEdb9dH+MB6gKSWvb9W9wOF40HFKBKkuLcRC1V0K2ICnDcj8RHVjyJom1QvJqsuubok8vhyiCfVB3cg8xvHQ+TRfqKcgsU6df+28VF0KDuPcx+8WVALlHWhQykkcxq3QwToKgBTJzAcSBfrASlogCGv3Q0YRTCzjuMJOkYNyZzpff3xFPrAkXN+F/lF+XLDaCIagco5U1ZQCTqg6vrwHox7S+rEfDwiyZqTqQ/MtHTrpY+IP01iliguvnkDd438oHUtetKiH7gD60i3iaLHtm1zpAiSoP+cvw3xaKVCjVh09RHaPluL+cGJNPzDW0hfw5GVIPa0b0R84YKWeEgFVn010jnyf4PEsTJVm8NL8oBzkhyxD66bt+vPfF3FMSQnMX003v3etYWpVcFTCQwHe9+74mNji6s0mgzLmbg559/3gVjgBLHuHhrbTSCQXYF2s7HU2fdYAQIxlSXKn0YabsrjqNfKKQWxWKdetINgQGYZlBtDpowPUwOKmDkWZxoH1bm3xvBitCCyrKmNa29rW0tA5WTVeu8Dd4x1IyBIIJGYkcbaXuQxc+UO2GVSSAkLTZNnzNpqXY362gNKlyjYOATwIHu+jFmXIUAMqkh+DE/AwJbM3ZMpKiTlsncBqd2Yx2VFnc7zdh0tpEtNhw94zH5aknv0gnSUqCR2M6h3jqd3i0K2kApU6FLdkvzA9FuZgnSYYokBh4/R4L01KW7Vh+kWH+20XJJSlhxIB4xGWT+Bo+YXg+9nHOw+++C/wDRqT7qR1cR7n1qUAkqCUp1JsBAbENq5YR2bg6EuH6DfHLeSb0in1RJidaJSSVzEpbhf4sIz/HNqMwPs3UkaqmHKjuA1iXaDGwpL5Qr/NoO7QQl1YTMIJF+AKm7gDbujuxYqWxOwtT4qVynUSouWcZUDdZI174DV1YXct4fSDE+QlEtKdCw05a+cKNesFR7RivSGik2WVYhaBGIznDxKJSf1t3RDVSUZT2ifKEm24stFJMGe3j7HzKngY6PP+/9R0aGhGxtSPzyv7l/si9K2YqRqZR/1L/ZHyOhceeaRpQTCNLs7OBuZf8Acr9kMOG4PNBBdHif2x0dHUs0miE8cS5ieBLU10+J+kBVbPzXfMjxV+2PsdBWaQixoPSKecyQspO7M5zDhdrjreC9DW1MvsqUmYngol/FvjHR0K532Dgg1Wz1LkhQtdjAv2S/8PnHR0TjKtGcEeZlGVC4T4n6WiqcGO4jxL+LPHR0OsjBwR6l4Qobx4n6QWoaUpI06+hH2OhZZGzcEGESy0VamQ/8/aOjokpOxuKBU+hJ4PuufpEVHRrD3S3fHR0V5uheCI66kWU2yPzf6X74qSsLmKXdSLnh9BHR0MsjSNwQwUWEkC6vD4aaRbqaPKgGxj7HRB5JNjcEBKmSVAFgb71K3cgOkUKTD1BRDh91y2nSOjospsXgi1MopiWLpzEuddC4I04fGBeIUswghOQC2r3GZ72jo6DHIzeNANOFTUkkezuGPaU7EvrliuNn5pLujm6lb+iY6OinmkP44lyVgMw2dDvxP7YKUmzkzeUf3K/bHR0K80hXjQVkYKALseTsPhBCXIKQwAA9co6Oibm2DgiCeVjRvH7QFNVPUs5QgMLFROpLaBPzjo6GU2FY0yxW0s1ctKpigpySzlndhusGG4QBn4XOWpypHK6mA4C0fY6GjlaN40DK7AJxPvI/uV+2PNFs3NdypFuav2x0dDeaQ/jVHvEcFnMwMu3Eq/bACbspPP5pfQqV+yOjoSWeQ8MaK69lKjjK/uX+yK87ZCqV+aSP9S/2R9jo48nyMj1ZZQSK3/gap/XJ/uX+yOjo6Ofkxz//2Q==",
    },
  },
];

const AgendarCitaClient = () => {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [servicioSel, setServicioSel] = useState(null);
  const [fechaSel, setFechaSel] = useState(null);
  const [horaSel, setHoraSel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bloquesOcupados, setBloquesOcupados] = useState([]);

  const estaListo = servicioSel && fechaSel && horaSel;

  const getHoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // 1. Escucha de ocupación en tiempo real por médico y fecha
  useEffect(() => {
    if (!fechaSel || !servicioSel) return;

    // Ahora consultamos la colección anónima de disponibilidad
    const q = query(
      collection(db, "agenda_medica"),
      where("fecha", "==", fechaSel),
      where("medico", "==", servicioSel.medico),
      where("estado", "in", ["pendiente", "confirmada"]),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const occupied = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const numSlots = Math.ceil((data.duracion || 15) / 15);
          let [h, m] = data.hora.split(":").map(Number);

          for (let i = 0; i < numSlots; i++) {
            occupied.push(
              `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
            );
            m += 15;
            if (m >= 60) {
              h++;
              m = 0;
            }
          }
        });
        setBloquesOcupados(occupied);

        if (horaSel && occupied.includes(horaSel)) {
          setHoraSel(null);
          Alert.alert(
            "Aviso",
            `El horario de las ${horaSel} ya no está disponible para el ${servicioSel.medico}.`,
          );
        }
      },
      (error) => {
        console.error("Error en escucha de agenda:", error);
      },
    );

    return () => unsubscribe();
  }, [fechaSel, servicioSel]);

  // 2. Generación de horarios disponibles (8:00 AM - 6:00 PM)
  const horariosFiltrados = useMemo(() => {
    const slots = [];
    const ahora = new Date();
    const hoyLocal = getHoyLocal();
    const esHoy = fechaSel === hoyLocal;
    const horaActual = ahora.getHours();
    const minActual = ahora.getMinutes();

    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const ocupado = bloquesOcupados.includes(hStr);
        let yaPaso = false;
        if (esHoy) {
          if (h < horaActual || (h === horaActual && m <= minActual))
            yaPaso = true;
        }
        slots.push({ hora: hStr, disponible: !ocupado && !yaPaso });
      }
    }
    return slots;
  }, [fechaSel, bloquesOcupados]);

  // Asegúrate de importar "doc" y "getDoc" de firestore arriba en tus imports:
  // import { addDoc, collection, onSnapshot, query, serverTimestamp, where, doc, getDoc } from "firebase/firestore";

  const enviarSolicitud = async () => {
    if (!estaListo) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      let nombreRealPaciente = "Paciente Registrado";

      // 1. Buscamos el nombre real del paciente en la colección de usuarios de Firestore
      if (user) {
        try {
          // Ajusta "usuarios" por el nombre exacto de tu colección (ej. "pacientes" o "users")
          const userDocRef = doc(db, "usuarios", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Validamos cómo tienes estructurado el nombre en tu base de datos
            nombreRealPaciente =
              userData.nombreCompleto ||
              `${userData.primerNombre || ""} ${userData.primerApellido || ""}`.trim() ||
              userData.nombre ||
              user.displayName ||
              "Paciente Registrado";
          } else if (user.displayName) {
            nombreRealPaciente = user.displayName;
          }
        } catch (errSnap) {
          console.log(
            "No se pudo obtener el perfil de Firestore, usando fallback:",
            errSnap,
          );
          if (user.displayName) nombreRealPaciente = user.displayName;
        }
      }

      // 2. Guardamos la cita detallada (Privada) en Firestore
      const docCitaRef = await addDoc(collection(db, "citas"), {
        pacienteId: user.uid,
        nombrePaciente: nombreRealPaciente, // Guardamos el nombre real recuperado
        servicio: servicioSel.nombre,
        duracion: servicioSel.duracion,
        fecha: fechaSel,
        hora: horaSel,
        medico: servicioSel.medico,
        estado: "pendiente",
        creadoEn: serverTimestamp(),
      });

      // 3. Guardamos el bloque de tiempo anónimo (Público para el calendario)
      await addDoc(collection(db, "agenda_medica"), {
        citaId: docCitaRef.id,
        medico: servicioSel.medico,
        fecha: fechaSel,
        hora: horaSel,
        duracion: servicioSel.duracion,
        estado: "pendiente",
      });

      // 4. Construimos el mensaje incluyendo el nombre real obtenido
      const msg =
        `🦷 *Nueva Solicitud de Cita*\n\n` +
        `👤 *Paciente:* ${nombreRealPaciente}\n` +
        `✨ *Servicio:* ${servicioSel.nombre}\n` +
        `👨‍⚕️ *Médico:* ${servicioSel.medico}\n` +
        `🗓️ *Fecha:* ${fechaSel}\n` +
        `⏰ *Hora:* ${horaSel}\n\n` +
        `Por favor, confirmar disponibilidad. ¡Muchas gracias!`;

      // 5. Disparamos la apertura de WhatsApp
      await Linking.openURL(
        `whatsapp://send?phone=593999036517&text=${encodeURIComponent(msg)}`,
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFDFD" }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reserva tu Cita</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.step, servicioSel && styles.stepDone]} />
            <View style={[styles.step, fechaSel && styles.stepDone]} />
            <View style={[styles.step, horaSel && styles.stepDone]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>1. Elige un servicio</Text>
          <View style={styles.grid}>
            {SERVICIOS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.serviceCard,
                  servicioSel?.id === item.id && styles.selectedBorder,
                ]}
                onPress={() => {
                  setServicioSel(item);
                  scrollRef.current?.scrollTo({ y: 400, animated: true });
                }}
              >
                <ImageBackground
                  source={item.img}
                  style={styles.imgBg}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <View
                    style={[
                      styles.overlay,
                      servicioSel?.id === item.id && styles.activeOverlay,
                    ]}
                  >
                    <Text style={styles.serviceText}>{item.nombre}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, !servicioSel && styles.disabledText]}>
            2. Selecciona la fecha
          </Text>
          <Calendar
            minDate={getHoyLocal()}
            onDayPress={(day) => {
              setFechaSel(day.dateString);
              scrollRef.current?.scrollTo({ y: 850, animated: true });
            }}
            markedDates={{
              [fechaSel]: {
                selected: true,
                selectedColor: COLORS.primaryGreen,
              },
            }}
            theme={{
              todayTextColor: COLORS.primaryGreen,
              arrowColor: COLORS.primaryGreen,
            }}
            style={styles.calendar}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, !fechaSel && styles.disabledText]}>
            3. Elige el horario
          </Text>
          <View style={styles.timeGrid}>
            {horariosFiltrados.map((item) => (
              <TouchableOpacity
                key={item.hora}
                disabled={!item.disponible}
                style={[
                  styles.timeSlot,
                  horaSel === item.hora && styles.timeSlotActive,
                  !item.disponible && styles.timeSlotDisabled,
                ]}
                onPress={() => setHoraSel(item.hora)}
              >
                <Text
                  style={[
                    styles.timeText,
                    horaSel === item.hora && { color: "#fff" },
                    !item.disponible && { color: "#ccc" },
                  ]}
                >
                  {item.hora}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {servicioSel && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: estaListo ? "#25D366" : "#9E9E9E" },
          ]}
          onPress={enviarSolicitud}
          disabled={!estaListo || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.fabContent}>
              <MaterialCommunityIcons name="whatsapp" size={28} color="#fff" />
              <Text style={styles.fabText}>
                {estaListo ? "Pedir Cita Ahora" : "Falta fecha u hora"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: COLORS.darkGreen || "#1A3A34",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, color: "#fff", fontWeight: "bold" },
  iconBtn: { padding: 5 },
  stepIndicator: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  step: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 5,
    borderRadius: 2,
  },
  stepDone: { backgroundColor: COLORS.primaryGreen || "#8CC63F" },
  section: { padding: 20 },
  label: { fontSize: 17, fontWeight: "bold", color: "#333", marginBottom: 15 },
  disabledText: { color: "#CCC" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: { width: "48%", height: 110, marginBottom: 15 },
  selectedBorder: {
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
    borderRadius: 15,
  },
  imgBg: { width: "100%", height: "100%", justifyContent: "flex-end" },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    height: "100%",
    justifyContent: "center",
    borderRadius: 12,
  },
  activeOverlay: { backgroundColor: "rgba(140, 198, 63, 0.6)" },
  serviceText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    padding: 5,
  },
  calendar: { borderRadius: 15, elevation: 2, padding: 10 },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeSlot: {
    width: "23%",
    padding: 12,
    backgroundColor: "#FFF",
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  timeSlotActive: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  timeSlotDisabled: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  timeText: { fontSize: 13, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 35,
    elevation: 10,
    minWidth: 250,
  },
  fabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
});

export default AgendarCitaClient;
